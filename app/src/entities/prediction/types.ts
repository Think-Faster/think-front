export type PredictionType =
  | 'fire'
  | 'gas'
  | 'flood'
  | 'equipmentFailure'
  | 'sensorFailure'
  | 'intrusion';

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
  picketId: string | null;
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
  decidedAt: string;
}

// reasonCode обязателен на бэкенде, когда action === 'reject' (доп. проверка
// в UI не дублируем — бэкенд сам ответит validation_failed, если забыли).
// Значения кодов нигде не перечислены (в отличие от PredictionType/Status) —
// поэтому в форме это обычное текстовое поле, а не select с угаданными
// вариантами.
export interface CreatePredictionDecisionRequest {
  action: DecisionAction;
  reasonCode?: string | null;
  comment?: string | null;
}
