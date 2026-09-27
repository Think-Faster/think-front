import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchReadingsScope } from './api';
import { useFunnelLog } from './useFunnelLog';
import { useFunnelStream } from './useFunnelStream';
import './LogsPage.css';

const LIMITS = [100, 500, 1000];

const PHASE_TEXT = {
  idle: 'Объект не выбран',
  connecting: 'Подключение…',
  live: 'На связи',
  reconnecting: 'Переподключение…',
  auth: 'Сессия истекла — войдите заново',
  forbidden: 'Нет доступа к показаниям этого объекта',
};

const UNAVAILABLE_TEXT = {
  service: 'Сервис показаний временно недоступен, пробуем снова',
  stream: 'Не удалось открыть поток показаний, пробуем снова',
};

function readObjectIdFromUrl() {
  const id = Number(new URLSearchParams(window.location.search).get('objectId'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function writeObjectIdToUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('objectId', String(id));
  else url.searchParams.delete('objectId');
  window.history.replaceState(null, '', url);
}

function formatTime(d) {
  return d ? d.toLocaleString('ru-RU') : '—';
}

function formatValue(v, unit) {
  if (v === undefined || v === null) return '—';
  const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return unit ? `${text} ${unit}` : text;
}

function ObjectPicker({ objectId, onChange }) {
  const [scope, setScope] = useState(null);
  const [draft, setDraft] = useState(objectId ? String(objectId) : '');

  useEffect(() => {
    const controller = new AbortController();
    fetchReadingsScope(controller.signal)
      .then(setScope)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDraft(objectId ? String(objectId) : '');
  }, [objectId]);

  // Объект открываем только по подтверждению, иначе каждая цифра переоткрывала бы сокет.
  const submit = (e) => {
    e.preventDefault();
    const id = Number(draft);
    onChange(Number.isInteger(id) && id > 0 ? id : null);
  };

  const known = scope?.objectIds ?? [];

  return (
    <form className="logs-picker" onSubmit={submit}>
      {known.length > 0 && (
        <select
          value={known.includes(objectId) ? objectId : ''}
          onChange={(e) => onChange(Number(e.target.value) || null)}
          aria-label="Доступные объекты"
        >
          <option value="">Мои объекты…</option>
          {known.map((id) => (
            <option key={id} value={id}>
              Объект {id}
            </option>
          ))}
        </select>
      )}
      <input
        type="number"
        min="1"
        placeholder="ID объекта"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="ID объекта"
      />
      <button type="submit">Открыть</button>
    </form>
  );
}

function ConnectionBadge({ stream }) {
  const text =
    stream.phase === 'unavailable' ? UNAVAILABLE_TEXT[stream.reason] : PHASE_TEXT[stream.phase];
  const stopped = stream.phase === 'auth' || stream.phase === 'forbidden';
  return (
    <div className={`logs-conn logs-conn--${stream.phase}`} role="status">
      <span className="logs-conn__dot" />
      {text}
      {stopped && (
        <button type="button" className="logs-link" onClick={stream.retry}>
          Повторить
        </button>
      )}
    </div>
  );
}

function LiveTable({ channels }) {
  const rows = useMemo(
    () =>
      Array.from(channels.values()).sort((a, b) =>
        String(a.channelId).localeCompare(String(b.channelId), 'ru', { numeric: true })
      ),
    [channels]
  );

  if (rows.length === 0) {
    return <p className="logs-empty">Показаний пока нет — ждём данных с датчиков.</p>;
  }

  return (
    <table className="logs-table">
      <thead>
        <tr>
          <th>Канал</th>
          <th>Значение</th>
          <th>Время</th>
          <th>Связь</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.channelId} className={r.silent ? 'is-silent' : undefined}>
            <td>{r.channelId}</td>
            <td className="logs-num">{formatValue(r.value, r.unit)}</td>
            <td>{formatTime(r.at)}</td>
            <td>
              {r.silent ? (
                <span className="logs-tag logs-tag--silent" title={`с ${formatTime(r.statusAt)}`}>
                  замолчал
                </span>
              ) : (
                <span className="logs-tag">на связи</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryTable({ log }) {
  if (log.status === 'error') {
    const text =
      log.error === 401
        ? 'Сессия истекла — войдите заново.'
        : log.error === 403
          ? 'Нет доступа к истории этого объекта.'
          : 'Не удалось загрузить историю.';
    return (
      <p className="logs-error">
        {text}{' '}
        <button type="button" className="logs-link" onClick={log.reload}>
          Повторить
        </button>
      </p>
    );
  }
  if (log.status === 'done' && log.items.length === 0) {
    return <p className="logs-empty">За выбранный период записей нет.</p>;
  }
  return (
    <table className={`logs-table${log.status === 'loading' ? ' is-loading' : ''}`}>
      <thead>
        <tr>
          <th>Время</th>
          <th>Канал</th>
          <th>Значение</th>
        </tr>
      </thead>
      <tbody>
        {log.items.map((r, i) => (
          <tr key={i}>
            <td>{formatTime(r.at)}</td>
            <td>{r.channelId ?? '—'}</td>
            <td className="logs-num">{formatValue(r.value, r.unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LogsPage() {
  const [objectId, setObjectIdState] = useState(readObjectIdFromUrl);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(LIMITS[0]);
  const [gap, setGap] = useState(null);

  const setObjectId = useCallback((id) => {
    setObjectIdState(id);
    setGap(null);
    writeObjectIdToUrl(id);
  }, []);

  const log = useFunnelLog({ objectId, from, to, limit });
  const { reload } = log;

  // Показания за время обрыва сервер не досылает: подсказываем период и, если история
  // показывается «по сейчас», перезапрашиваем её — пропуск закроется архивом.
  const onReconnected = useCallback(
    (period) => {
      setGap(period);
      if (!to) reload();
    },
    [to, reload]
  );

  const stream = useFunnelStream(objectId, { onReconnected });

  return (
    <section className="logs">
      <header className="logs-head">
        <h1>Логи</h1>
        <ObjectPicker objectId={objectId} onChange={setObjectId} />
      </header>

      {objectId && (
        <>
          <div className="logs-block">
            <div className="logs-block__head">
              <h2>Текущие показания</h2>
              <ConnectionBadge stream={stream} />
            </div>
            {stream.dropped > 0 && (
              <p className="logs-note">
                Поток шёл быстрее, чем успевала вкладка: пропущено показаний — {stream.dropped}.
              </p>
            )}
            {gap && (
              <p className="logs-note">
                Связь прерывалась {formatTime(gap.from)} — {formatTime(gap.to)}; показания за этот период
                — в истории ниже.{' '}
                <button type="button" className="logs-link" onClick={() => setGap(null)}>
                  Скрыть
                </button>
              </p>
            )}
            <LiveTable channels={stream.channels} />
          </div>

          <div className="logs-block">
            <div className="logs-block__head">
              <h2>История</h2>
              <div className="logs-filters">
                <label>
                  с
                  <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label>
                  по
                  <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                <label>
                  записей
                  <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    {LIMITS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={reload} disabled={log.status === 'loading'}>
                  Обновить
                </button>
              </div>
            </div>
            <p className="logs-hint">Без дат — последние 72 часа, новые записи сверху.</p>
            <HistoryTable log={log} />
          </div>
        </>
      )}
    </section>
  );
}
