export interface RetrainJob {
  id: string;
  requestedBy: string;
  requestedAt: string;
  paramsJson: string | null;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultModelVersionId: string | null;
  logRef: string | null;
}

// Тело не описано в доке инлайн — единственное поле, которое имеет смысл
// задавать вручную, это paramsJson (сырой JSON, как geometryGeoJson у
// объектов — без схемы). Остальное бэкенд проставляет сам (status стартует
// с "requested").
export interface CreateRetrainJobRequest {
  paramsJson?: string | null;
}
