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

export type PredictionStatus = 'new' | 'inReview' | 'taken' | 'rejected' | 'muted' | 'closed';

export type DecisionAction = 'take' | 'reject' | 'mute' | 'reopen';

export interface PredictionListItem {
  id: string;
  objectId: number;
  type: PredictionType;
  topic: string;
  probability: number; // 0..1
  hourEnd: string;
  sinceHours: number;
  status: PredictionStatus;
}

export interface PredictionFactor {
  feature: string;
  value: number;
  weight: number;
  direction: string;
}

export interface PredictionEvidence {
  sensorId: number;
  picketId: number | null;
  ts: string;
  value: number | null;
}

export interface Prediction extends PredictionListItem {
  horizonHours: number;
  score: number;
  threshold: number;
  alarm: boolean;
  confidence: number;
  description: string | null;
  classification: string | null;
  recommendation: string | null;
  modelVersionId: string | null;
  mutedReason: string | null;
  factors: PredictionFactor[];
  evidence: PredictionEvidence[];
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
