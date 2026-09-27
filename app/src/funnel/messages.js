// Разбор сообщений tf-funnel (WebSocket и записи GET /api/funnel/log).
//
// ВНИМАНИЕ: точные имена полей нужно сверить с stream.go в репозитории tf-funnel — на момент
// написания его исходники были недоступны. Всё знание о формате сосредоточено здесь: если
// имена отличаются, правится только этот файл (списки FIELDS ниже), остальной код работает
// с нормализованными объектами { channelId, value, unit, at, ... }.

const FIELDS = {
  channelId: ['channelId', 'channel_id', 'sensorId', 'sensor_id', 'channel', 'ид_канала_данных'],
  value: ['value', 'val', 'значение'],
  unit: ['unit', 'units', 'ед_изм'],
  at: ['ts', 'time', 'at', 'timestamp', 'время'],
  objectId: ['objectId', 'object_id'],
  silent: ['silent', 'isSilent'],
  state: ['state', 'status'],
  count: ['count', 'n', 'dropped', 'missed'],
  items: ['items', 'records', 'entries', 'data'],
};

function pick(obj, names) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const name of names) {
    if (obj[name] !== undefined && obj[name] !== null) return obj[name];
  }
  return undefined;
}

function toDate(v) {
  if (v === undefined) return null;
  // Числовое время: секунды или миллисекунды Unix.
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeReading(raw) {
  return {
    channelId: pick(raw, FIELDS.channelId),
    objectId: pick(raw, FIELDS.objectId),
    value: pick(raw, FIELDS.value),
    unit: pick(raw, FIELDS.unit),
    at: toDate(pick(raw, FIELDS.at)) || new Date(),
    raw,
  };
}

// true — канал замолчал, false — снова на связи, null — не удалось понять.
function parseSilent(raw) {
  const flag = pick(raw, FIELDS.silent);
  if (typeof flag === 'boolean') return flag;
  const state = String(pick(raw, FIELDS.state) ?? '').toLowerCase();
  if (['silent', 'silence', 'lost', 'down', 'offline'].includes(state)) return true;
  if (['online', 'alive', 'restored', 'up', 'ok'].includes(state)) return false;
  return null;
}

// Разбор одного кадра WebSocket. Возвращает { type, ... } или null для нераспознанного JSON.
export function parseStreamMessage(data) {
  let raw;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  switch (raw?.type) {
    case 'ready':
      return { type: 'ready', raw };
    case 'reading':
      return { type: 'reading', ...normalizeReading(raw) };
    case 'status':
      return {
        type: 'status',
        channelId: pick(raw, FIELDS.channelId),
        silent: parseSilent(raw),
        at: toDate(pick(raw, FIELDS.at)) || new Date(),
        raw,
      };
    case 'dropped':
      return { type: 'dropped', count: Number(pick(raw, FIELDS.count)) || 0, raw };
    default:
      return { type: raw?.type ?? 'unknown', raw };
  }
}

// Ответ /api/funnel/log: массив записей или объект-обёртка с массивом.
export function normalizeLog(body) {
  const list = Array.isArray(body) ? body : pick(body, FIELDS.items);
  return Array.isArray(list) ? list.map(normalizeReading) : [];
}
