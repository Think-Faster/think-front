import { PredictionType } from '../prediction/types';

// Состояние модели (tf-model GET /api/ml/status, ML/INTEGRATION.md §13.3): версии по типам, рабочие доли,
// игнорируемые периоды. Хранит их модель, BFF только передаёт команды на изменение (/bff/model-commands/*).

export interface ModelBuild {
  number: number;
  name: string | null;
  about: string | null;
  built: string | null;
}

export interface ModelTypeVersion {
  // null — основная выгрузка
  current: number | null;
  available: ModelBuild[];
}

export interface OperatingShare {
  share: number;
  // null — правило отклонения у типа выключено
  rejectK: number | null;
}

export interface OperatingSettings {
  version: number;
  changed: string | null;
  changedBy: string | null;
  reason: string | null;
  types: Record<PredictionType, OperatingShare>;
}

export interface OperatingBounds {
  share: Record<PredictionType, [number, number]>;
  rejectK: [number, number];
}

// Время — московское, «ГГГГ-ММ-ДД ЧЧ:ММ», как в таблице модели.
export interface IgnoredPeriod {
  a: string;
  b: string;
  comment: string;
}

export interface ModelStatus {
  types: Record<PredictionType, ModelTypeVersion>;
  settings: OperatingSettings;
  bounds: OperatingBounds;
  gaps: { version: number; rows: IgnoredPeriod[] };
  retrain: { enabled: boolean; needed: boolean; reason: string | null };
}

export interface ShareEstimate {
  share: number;
  currentShare: number;
  alarmsPerDay: number;
  windowDays: number;
}

export interface ModelCommandAccepted {
  commandId: string;
  kind: string;
}
