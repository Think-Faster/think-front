import { PredictionType } from '../prediction/types';

// Тревога по факту: сработали датчики (triggerSensorIds), объявлена в
// announcedAt. status — строка BFF без закрытого списка значений.
export interface FactAlert {
  id: string;
  objectId: number;
  type: PredictionType;
  startedAt: string;
  announcedAt: string;
  triggerSensorIds: number[];
  status: string;
}
