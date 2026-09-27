// Показание датчика из воронки (tf-funnel): одно событие шины объекта.
export interface Reading {
  sensorId: number; // "ид_канала_данных"
  eventId: number;
  date: string; // дата и время на объекте, как пришли в пакете (МСК)
  time: string;
  alarm: boolean;
  value: string; // число или текст состояния ("Тревога"), как в шине
  receivedAt: string; // когда воронка приняла пакет, ISO 8601
}

export interface ReadingsPage {
  items: Reading[]; // новые сверху
  more: boolean;
}

export interface ReadingsQuery {
  objectId?: number;
  from?: string;
  to?: string;
  limit?: number;
}

// GET /bff/readings/scope. all — право readings:read (любой объект); без
// него — объекты заявок, на которые пользователь назначен и работа идёт.
export interface ReadingsScope {
  all: boolean;
  objectIds: number[];
  sensorIds: number[];
}

// Сообщения WebSocket /funnel/stream.
export type StreamMessage =
  | { type: 'ready'; objectIds: number[]; sensors: number }
  | ({ type: 'reading' } & Reading)
  | { type: 'status'; sensorId: number; status: 'silent' | 'ok'; at: string; since: string }
  | { type: 'dropped'; count: number };
