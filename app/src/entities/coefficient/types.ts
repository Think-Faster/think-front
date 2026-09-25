import { PredictionType } from '../prediction/types';

export interface Coefficient {
  id: string;
  type: PredictionType;
  share: number; // 0..1, доля объекто-часов под тревогой
  rejectK: number | null;
  version: number;
  createdBy: string;
  createdAt: string;
  reason: string | null;
}

// Тело не описано в доке инлайн — выведено из CoefficientDto за вычетом
// серверных полей (id/version/createdBy/createdAt). POST — не апдейт,
// каждая правка создаёт новую версию (см. coefficientRepository).
export interface CreateCoefficientRequest {
  type: PredictionType;
  share: number;
  rejectK?: number | null;
  reason?: string | null;
}
