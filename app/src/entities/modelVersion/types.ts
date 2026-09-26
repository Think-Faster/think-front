export interface ModelVersion {
  id: string;
  name: string;
  isDefault: boolean;
  switchedAt: string | null;
  switchedBy: string | null;
  createdAt: string;
}

// Тело POST /model-versions не описано в доке инлайн (как и у всех POST в
// разделе админ-настроек модели) — выведено из ModelVersionDto за вычетом
// серверных полей. id — единственное исключение в этом разделе: пометка
// «Дубль id → 409 duplicate_code» имеет смысл только если id задаёт клиент
// (иначе дубликат генерируемого id невозможен), в отличие от остальных
// сущностей ниже, где id обычный сервер-генерируемый.
export interface CreateModelVersionRequest {
  id: string;
  name: string;
}
