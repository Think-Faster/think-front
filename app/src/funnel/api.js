// HTTP-часть интеграции с tf-funnel и tf-auth.
// Все запросы идут на тот же домен (nginx стенда или dev-прокси), авторизация — cookie access_token.

const FUNNEL = '/api/funnel';

export class HttpError extends Error {
  constructor(status, message) {
    super(message || `HTTP ${status}`);
    this.status = status;
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) {
    throw new HttpError(res.status);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// wss://<текущий домен>/api/funnel/stream?objectId=<id>. Токен в URL не передаём — его несёт cookie.
export function streamUrl(objectId) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${FUNNEL}/stream?objectId=${encodeURIComponent(objectId)}`;
}

// История «Логов»: новые записи сверху, глубина по умолчанию 72 ч.
// nginx пропускает 5 запросов/с — вызывать только через debounce.
export function fetchLog({ objectId, from, to, limit }, signal) {
  const params = new URLSearchParams({ objectId: String(objectId) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', String(limit));
  return request(`${FUNNEL}/log?${params}`, { signal });
}

// Возвращает HTTP-код /api/funnel/status: нужен, чтобы отличить 401/403 от 503,
// когда WebSocket падает до открытия (браузер показывает это как 1006 без кода).
export async function fetchStatusCode() {
  try {
    const res = await fetch(`${FUNNEL}/status`, { credentials: 'include' });
    return res.status;
  } catch {
    return 0;
  }
}

// Обновление access_token через refresh_token (tf-auth ставит новые cookie сам).
// Параллельные вызовы склеиваются в один запрос.
let refreshInFlight = null;

export function refreshToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Какие объекты пользователь может открыть в «Логах» (BFF). all=true — любые (диспетчеры, админы).
export function fetchReadingsScope(signal) {
  return request('/api/bff/readings/scope', { signal });
}
