import { PredictionType } from '../prediction/types';

export interface Incident {
  id: string;
  objectId: number;
  type: PredictionType;
  startedAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  taskId: string | null;
  predictionId: string | null;
  outcome: string | null;
}

// outcome не перечислен нигде как закрытый список — обычное текстовое поле,
// как reasonCode у решений по прогнозам.
export interface ConfirmIncidentRequest {
  outcome?: string | null;
}
