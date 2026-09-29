export type PredictionType =
  | 'fire'
  | 'gas'
  | 'flood'
  | 'equipmentFailure'
  | 'sensorFailure'
  | 'intrusion'
  // только по факту (FactAlert): прогнозов этих типов нет, ML/INTEGRATION.md §13.11
  | 'temperature'
  | 'blind';

// Типы, которые модель прогнозирует: коэффициенты, фильтры прогнозов.
export const FORECAST_TYPES: PredictionType[] = [
  'fire',
  'gas',
  'flood',
  'equipmentFailure',
  'sensorFailure',
  'intrusion',
];

// Авария даёт объекту статус «тревога», инцидент — нет (§13.11).
export type AlertGroup = 'accident' | 'incident';

// expired — тревога модели кончилась (alarm=false), решения по карточке не было.
export type PredictionStatus = 'new' | 'inReview' | 'taken' | 'rejected' | 'muted' | 'closed' | 'expired';

export type DecisionAction = 'take' | 'reject' | 'mute' | 'reopen';

export interface PredictionListItem {
  id: string;
  objectId: number;
  type: PredictionType;
  topic: string;
  // калиброванная вероятность события за горизонт (0..1); 0 — у типа нет калибровки
  probability: number;
  hourEnd: string;
  sinceHours: number;
  status: PredictionStatus;
  // тревога модели ещё горит; false — кончилась в alarmEndedAt
  alarm: boolean;
  alarmEndedAt: string | null;
}

// Главные признаки модели для типа (важность признака, а не разбор этой тревоги).
export interface PredictionFactor {
  feature: string;
  // подпись словами от модели; нет — показываем feature
  label: string | null;
  value: number;
  weight: number;
  direction: string;
}

export interface PredictionEvidence {
  sensorId: number;
  picketId: number | null;
  ts: string;
  value: number | null;
  // значение дискретного канала («Обнаружен дым»)
  valueText: string | null;
  // из справочника при чтении карточки
  sensorName: string | null;
  sensorType: string | null;
  picketCode: string | null;
}

export interface Prediction extends PredictionListItem {
  horizonHours: number;
  // место часа в распределении парка (0..1) и порог тревоги по той же шкале — НЕ вероятность
  score: number;
  threshold: number;
  confidence: number;
  description: string | null;
  classification: string | null;
  recommendation: string | null;
  modelVersionId: string | null;
  mutedReason: string | null;
  // status === 'muted': до какого времени
  mutedUntil: string | null;
  factors: PredictionFactor[];
  evidence: PredictionEvidence[];
}

// GET /predictions/stats — сводка журнала и сверка с последним тактом модели.
export interface PredictionTypeStats {
  type: PredictionType;
  // тревога модели горит (любой статус карточки)
  activeAlarms: number;
  // new + inReview
  open: number;
  taken: number;
  muted: number;
  rejected: number;
  createdLast24h: number;
  endedLast24h: number;
}

export interface PredictionStats {
  lastHourEnd: string | null;
  activeAlarms: number;
  // модель не подтверждала дольше часа после последнего часа — потерялись сообщения, в норме 0
  staleAlarms: number;
  open: number;
  createdLast24h: number;
  endedLast24h: number;
  byType: PredictionTypeStats[];
}

export interface PredictionDecision {
  id: string;
  predictionId: string;
  userId: string;
  action: DecisionAction;
  reasonCode: string | null;
  comment: string | null;
  taskId: string | null;
  mutedUntil: string | null;
  decidedAt: string;
}

// reasonCode обязателен при reject (коды — rejectReasonOptions, «other» —
// только с комментарием). take без taskId заводит заявку на BFF и отдаёт её id
// в PredictionDecision.taskId; с taskId — прикрепляет к открытой заявке того же
// объекта. until обязателен при mute (не раньше чем через час).
export interface CreatePredictionDecisionRequest {
  action: DecisionAction;
  reasonCode?: string | null;
  comment?: string | null;
  taskId?: string | null;
  until?: string | null;
}
