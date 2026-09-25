export type ScheduleStatus = 'working' | 'notWorking' | 'onLeave';

export interface ScheduleEntry {
  id: string;
  userId: string;
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;
  status: ScheduleStatus;
  source: string | null;
  changedBy: string;
  changedAt: string;
}

// Тело POST /users/{id}/schedule не описано в доке явно (в отличие от
// assigned-objects/confirm, где оно приведено инлайном) — состав полей
// выведен из ScheduleEntryDto за вычетом серверных (id/changedBy/changedAt).
// Если бэкенд ждёт другой набор — поправить только здесь и в
// scheduleRepository.create().
export interface CreateScheduleEntryRequest {
  dateFrom: string;
  dateTo: string;
  status: ScheduleStatus;
  source?: string | null;
}
