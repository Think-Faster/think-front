import { PredictionType } from '../prediction/types';

export type WorkSource = 'organizer' | 'chiefDispatcher' | 'carriedOver';

// Текущая версия плановой работы (WorkScheduleEntryDto): на окно работы модель
// глушит тревоги перечисленных типов по объекту и его потомкам.
export interface WorkScheduleEntry {
  workId: number;
  version: number;
  objectId: number | null;
  workKind: string;
  incidentTypes: PredictionType[];
  removedSensor: string | null;
  startsAt: string;
  endsAt: string;
  source: WorkSource;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface WorkScheduleQuery {
  from?: string;
  to?: string;
  objectId?: number;
}
