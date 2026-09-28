import { AlertGroup, PredictionType } from '../prediction/types';

// Точка маршрута нарушителя: сработка датчика охраны. Координаты и пикет —
// у датчика в слое карты 3, в факте их нет.
export interface FactRoutePoint {
  sensorId: number;
  sType: string | null;
  at: string;
}

// Тревога по факту: эпизод, который модель ведёт, пока он идёт (live) —
// lastAt, маршрут и подробности обновляются каждый час. status — строка BFF
// без закрытого списка значений.
export interface FactAlert {
  id: string;
  objectId: number;
  type: PredictionType;
  group: AlertGroup;
  startedAt: string;
  announcedAt: string;
  lastAt: string;
  live: boolean;
  triggerSensorIds: number[];
  status: string;
  route: FactRoutePoint[];
  detailsJson: string | null;
}

export interface TemperatureChannel {
  sensorId: number;
  value: number;
  baseline: number;
  at: string;
}

// Разобранный detailsJson (ML/INTEGRATION.md §13.11): ключи есть только у своих типов.
export interface FactDetails {
  direction?: 'cold' | 'hot'; // temperature
  channels?: TemperatureChannel[]; // temperature
  cause?: 'link' | 'power'; // blind
  share?: number; // blind: доля каналов (фаз) объекта без данных, 0–1
  possibleAccident?: boolean; // blind
  temperature?: { direction: 'hot'; channels: TemperatureChannel[] }; // fire при жаре
}

export function factDetails(alert: FactAlert): FactDetails {
  if (!alert.detailsJson) {
    return {};
  }
  try {
    return JSON.parse(alert.detailsJson) as FactDetails;
  } catch {
    return {};
  }
}
