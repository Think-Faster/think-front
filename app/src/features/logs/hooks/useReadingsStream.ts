import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { readingRepository } from '../../../entities/reading/readingRepository';
import { Reading, StreamMessage } from '../../../entities/reading/types';

export type StreamState = 'idle' | 'loading' | 'live' | 'reconnecting' | 'error';

// Живых показаний в памяти окна; «Показать ещё» дочитывает историю сверх этого.
const KEEP = 500;
const PAGE = 200;
// Паузы между попытками переподключения.
const RETRY_MS = [1000, 3000, 10000, 30000];
// Воронка закрывает поток с 4401, когда истёк токен: любой запрос к BFF
// перевыпускает куку, после него подключаемся снова.
const TOKEN_EXPIRED = 4401;

function key(reading: Reading): string {
  return `${reading.sensorId}:${reading.eventId}`;
}

function newestFirst(a: Reading, b: Reading): number {
  return (
    Date.parse(b.receivedAt) - Date.parse(a.receivedAt) ||
    `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) ||
    b.eventId - a.eventId
  );
}

function merge(current: Reading[], incoming: Reading[], limit: number): Reading[] {
  const seen = new Set(current.map(key));
  const fresh = incoming.filter(reading => !seen.has(key(reading)));
  if (fresh.length === 0) {
    return current;
  }
  return [...fresh, ...current].sort(newestFirst).slice(0, limit);
}

// Воронка отвечает { detail }, BFF — { code, message }.
export function funnelErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail) {
      return detail;
    }
    if (!error.response) {
      return fallback;
    }
  }
  return formatBffErrorMessage(error, fallback);
}

export interface StreamInfo {
  objectIds: number[];
  sensors: number;
}

// Показания объекта: история из архива воронки, затем живой поток по
// WebSocket. objectId не задан — объекты заявок инженера (воронка сама
// спрашивает у BFF, что ему видно). Поток переподключается сам и дочитывает
// из архива то, что пришло, пока связи не было.
export function useReadingsStream(objectId: number | undefined, active: boolean) {
  const [items, setItems] = useState<Reading[]>([]);
  const [state, setState] = useState<StreamState>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState<StreamInfo | null>(null);
  const [silent, setSilent] = useState<Record<number, string>>({});
  const [dropped, setDropped] = useState(0);
  const [more, setMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nonce, setNonce] = useState(0);
  const itemsRef = useRef<Reading[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    setItems([]);
    setInfo(null);
    setSilent({});
    setDropped(0);
    setMore(false);
    setError('');

    if (!active) {
      setState('idle');
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let last: string | undefined;

    function track(readings: Reading[]) {
      for (const reading of readings) {
        if (!last || Date.parse(reading.receivedAt) > Date.parse(last)) {
          last = reading.receivedAt;
        }
      }
    }

    async function catchUp() {
      try {
        const page = await readingRepository.getLog({ objectId, from: last, limit: PAGE });
        if (!disposed) {
          track(page.items);
          setItems(current => merge(current, page.items, Math.max(KEEP, current.length)));
        }
      } catch {
        // пропуск не дочитан — живой поток всё равно идёт
      }
    }

    function connect() {
      const ws = new WebSocket(readingRepository.streamUrl(objectId));
      socket = ws;

      ws.onmessage = event => {
        const message = JSON.parse(String(event.data)) as StreamMessage;
        switch (message.type) {
          case 'ready':
            attempt = 0;
            setInfo({ objectIds: message.objectIds, sensors: message.sensors });
            setState('live');
            if (last) {
              void catchUp();
            }
            break;
          case 'reading': {
            const { type: _type, ...reading } = message;
            track([reading]);
            setItems(current => merge(current, [reading], Math.max(KEEP, current.length)));
            break;
          }
          case 'status':
            setSilent(current => {
              const next = { ...current };
              if (message.status === 'silent') {
                next[message.sensorId] = message.since;
              } else {
                delete next[message.sensorId];
              }
              return next;
            });
            break;
          case 'dropped':
            setDropped(count => count + message.count);
            break;
        }
      };

      ws.onclose = event => {
        if (disposed || socket !== ws) {
          return;
        }
        socket = null;
        setState('reconnecting');
        const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
        attempt += 1;
        const refresh =
          event.code === TOKEN_EXPIRED ? readingRepository.getScope().then(() => undefined, () => undefined) : Promise.resolve();
        timer = setTimeout(() => {
          void refresh.then(() => {
            if (!disposed) {
              connect();
            }
          });
        }, event.code === TOKEN_EXPIRED && attempt === 1 ? 0 : delay);
      };
    }

    setState('loading');
    // История первой: у WebSocket причину отказа (нет прав, нет заявок) не
    // узнать, а /log отвечает её текстом.
    readingRepository
      .getLog({ objectId, limit: PAGE })
      .then(page => {
        if (disposed) {
          return;
        }
        track(page.items);
        setItems(page.items);
        setMore(page.more);
        connect();
      })
      .catch(err => {
        if (!disposed) {
          setError(funnelErrorMessage(err, 'Не удалось загрузить показания.'));
          setState('error');
        }
      });

    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close(1000);
      socket = null;
    };
  }, [objectId, active, nonce]);

  // Старее самого старого показанного. Архив хранит время приёма до секунды:
  // берём и эту секунду, повторы отсеиваются по датчику и номеру события.
  const loadOlder = useCallback(async () => {
    const oldest = itemsRef.current[itemsRef.current.length - 1];
    if (!oldest) {
      return;
    }
    setLoadingOlder(true);
    try {
      const to = new Date(Math.floor(Date.parse(oldest.receivedAt) / 1000) * 1000 + 1000).toISOString();
      const page = await readingRepository.getLog({ objectId, to, limit: PAGE });
      const before = itemsRef.current.length;
      const next = merge(itemsRef.current, page.items, Number.MAX_SAFE_INTEGER);
      setItems(next);
      setMore(page.more && next.length > before);
    } catch (err) {
      setError(funnelErrorMessage(err, 'Не удалось загрузить показания.'));
    } finally {
      setLoadingOlder(false);
    }
  }, [objectId]);

  const reload = useCallback(() => setNonce(value => value + 1), []);

  return { items, state, error, info, silent, dropped, more, loadingOlder, loadOlder, reload };
}
