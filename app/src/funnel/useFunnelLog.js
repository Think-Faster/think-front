import { useCallback, useEffect, useState } from 'react';
import { fetchLog, HttpError, refreshToken } from './api';
import { normalizeLog } from './messages';

// nginx пропускает 5 запросов/с на /api/funnel/log — запросы только после паузы в вводе.
const DEBOUNCE_MS = 500;
const RETRY_429_MS = 1500;

/**
 * История показаний объекта из архива tf-funnel («Логи»).
 * Параметры фильтра можно менять сколько угодно часто — запрос уйдёт один, после паузы.
 * reload() — повторить текущий запрос (тоже через debounce).
 */
export function useFunnelLog({ objectId, from, to, limit }) {
  const [state, setState] = useState({ status: 'idle', items: [], error: null });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!objectId) {
      setState({ status: 'idle', items: [], error: null });
      return undefined;
    }

    const controller = new AbortController();
    let timer = null;

    const run = async (refreshed = false) => {
      const query = { objectId, from: toIso(from), to: toIso(to), limit };
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const body = await fetchLog(query, controller.signal);
        setState({ status: 'done', items: normalizeLog(body), error: null });
      } catch (e) {
        if (controller.signal.aborted) return;
        const status = e instanceof HttpError ? e.status : 0;
        if (status === 401 && !refreshed && (await refreshToken())) {
          if (!controller.signal.aborted) run(true);
          return;
        }
        if (status === 429) {
          setState((s) => ({ ...s, status: 'loading', error: null }));
          timer = setTimeout(() => run(refreshed), RETRY_429_MS);
          return;
        }
        setState((s) => ({ ...s, status: 'error', error: status }));
      }
    };

    timer = setTimeout(() => run(), DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [objectId, from, to, limit, nonce]);

  return { ...state, reload };
}

// Значение <input type="datetime-local"> (локальное время) → ISO UTC.
function toIso(local) {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
