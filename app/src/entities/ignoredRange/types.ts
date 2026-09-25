export type IgnoredRangeScope = 'all' | 'object' | 'sensor';

export interface IgnoredRange {
  id: string;
  scope: IgnoredRangeScope;
  objectId: number | null;
  sensorId: number | null;
  dateFrom: string;
  dateTo: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

// Тело не описано в доке инлайн — выведено из IgnoredRangeDto за вычетом
// серверных полей. objectId обязателен при scope: "object", sensorId — при
// scope: "sensor" (по доке) — форма это проверяет на глаз, финальную
// валидацию всё равно делает бэкенд.
export interface CreateIgnoredRangeRequest {
  scope: IgnoredRangeScope;
  objectId?: number | null;
  sensorId?: number | null;
  dateFrom: string;
  dateTo: string;
  reason: string;
}
