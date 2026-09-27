import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStatusCode, refreshToken, streamUrl } from './api';
import { parseStreamMessage } from './messages';

// Паузы между попытками переподключения; сбрасываются после `ready`.
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];
// Сколько обрывов подряд без `ready` терпим, прежде чем спросить /api/funnel/status.
const FAILURES_BEFORE_CHECK = 3;

const CLOSE_NORMAL = 1000;
const CLOSE_TOKEN_EXPIRED = 4401;

// Фазы соединения:
//   idle         — объект не выбран;
//   connecting   — ждём `ready`;
//   live         — подписка принята, идут показания;
//   reconnecting — обрыв, ждём следующей попытки;
//   unavailable  — сервис/BFF недоступен (503), попытки продолжаются редко;
//   auth         — нет авторизации, попытки остановлены;
//   forbidden    — нет прав, попытки остановлены.
const IDLE = { phase: 'idle' };

/**
 * Живой поток показаний tf-funnel по объекту. Один сокет на вкладку и объект:
 * при смене objectId или размонтировании сокет закрывается с кодом 1000.
 *
 * onReconnected({ from, to }) вызывается после `ready`, если до этого поток обрывался, —
 * показания за время обрыва сервер не досылает, их можно догрузить через «Логи».
 */
export function useFunnelStream(objectId, { onReconnected } = {}) {
  const [conn, setConn] = useState(IDLE);
  const [channels, setChannels] = useState(() => new Map());
  const [dropped, setDropped] = useState(0);
  const [nonce, setNonce] = useState(0);

  const onReconnectedRef = useRef(onReconnected);
  onReconnectedRef.current = onReconnected;

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    setChannels(new Map());
    setDropped(0);
    if (!objectId) {
      setConn(IDLE);
      return undefined;
    }

    let ws = null;
    let timer = null;
    let disposed = false;
    let attempt = 0;
    let failures = 0;
    let statusChecked = false;
    let live = false;
    let droppedAt = null;

    // Показания могут идти сотнями в секунду — копим изменения и применяем раз в кадр.
    let pending = new Map();
    let frame = null;

    const flush = () => {
      frame = null;
      const batch = pending;
      pending = new Map();
      setChannels((prev) => {
        const next = new Map(prev);
        batch.forEach((patch, id) => next.set(id, { ...prev.get(id), ...patch }));
        return next;
      });
    };

    const patchChannel = (id, patch) => {
      const key = id ?? '—';
      pending.set(key, { ...pending.get(key), channelId: key, ...patch });
      if (frame === null) frame = requestAnimationFrame(flush);
    };

    const nextDelay = () => RETRY_DELAYS[Math.min(attempt++, RETRY_DELAYS.length - 1)];

    const scheduleReconnect = () => {
      const delay = nextDelay();
      setConn((prev) =>
        prev.phase === 'unavailable'
          ? { ...prev, retryAt: Date.now() + delay }
          : { phase: 'reconnecting', retryAt: Date.now() + delay }
      );
      timer = setTimeout(connect, delay);
    };

    const stop = (phase) => {
      setConn({ phase });
    };

    const refreshAndReconnect = () => {
      refreshToken().then((ok) => {
        if (disposed) return;
        if (ok) connect();
        else stop('auth');
      });
    };

    // Несколько обрывов подряд без `ready`: браузер не отдаёт HTTP-код неудачного
    // рукопожатия, поэтому один раз спрашиваем /status с той же cookie.
    const diagnose = async () => {
      const status = await fetchStatusCode();
      if (disposed) return;
      if (status === 401) {
        failures = 0;
        refreshAndReconnect();
      } else if (status === 403) {
        stop('forbidden');
      } else {
        setConn({
          phase: 'unavailable',
          reason: status === 503 || status === 0 || status >= 500 ? 'service' : 'stream',
        });
        scheduleReconnect();
      }
    };

    const handleMessage = (msg) => {
      if (!msg) return;
      switch (msg.type) {
        case 'ready':
          attempt = 0;
          failures = 0;
          statusChecked = false;
          live = true;
          setConn({ phase: 'live' });
          if (droppedAt) {
            onReconnectedRef.current?.({ from: droppedAt, to: new Date() });
            droppedAt = null;
          }
          break;
        case 'reading':
          patchChannel(msg.channelId, { value: msg.value, unit: msg.unit, at: msg.at, silent: false });
          break;
        case 'status':
          if (msg.silent !== null) patchChannel(msg.channelId, { silent: msg.silent, statusAt: msg.at });
          break;
        case 'dropped':
          setDropped((d) => d + msg.count);
          break;
        default:
          break;
      }
    };

    const handleClose = (code) => {
      if (live) {
        live = false;
        droppedAt = droppedAt || new Date();
      }
      if (code === CLOSE_TOKEN_EXPIRED) {
        setConn({ phase: 'reconnecting' });
        refreshAndReconnect();
        return;
      }
      // 1001 (перезапуск сервера), 1006 и прочие обрывы — переподключение с паузой.
      failures += 1;
      if (failures >= FAILURES_BEFORE_CHECK && !statusChecked) {
        statusChecked = true;
        diagnose();
        return;
      }
      scheduleReconnect();
    };

    function connect() {
      timer = null;
      if (disposed) return;
      setConn((prev) => (prev.phase === 'unavailable' ? prev : { phase: 'connecting' }));
      const sock = new WebSocket(streamUrl(objectId));
      ws = sock;
      sock.onmessage = (e) => {
        if (ws === sock) handleMessage(parseStreamMessage(e.data));
      };
      sock.onclose = (e) => {
        if (ws !== sock) return;
        ws = null;
        if (!disposed) handleClose(e.code);
      };
    }

    const closeSocket = () => {
      clearTimeout(timer);
      timer = null;
      if (ws) {
        const sock = ws;
        ws = null;
        sock.close(CLOSE_NORMAL);
      }
    };

    // Уход со страницы (в т.ч. в bfcache) — закрываем сокет; возврат из bfcache — открываем заново.
    const onPageHide = () => closeSocket();
    const onPageShow = (e) => {
      if (e.persisted && !ws && !disposed) {
        attempt = 0;
        connect();
      }
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    connect();

    return () => {
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      if (frame !== null) cancelAnimationFrame(frame);
      closeSocket();
    };
  }, [objectId, nonce]);

  return { ...conn, channels, dropped, retry };
}
