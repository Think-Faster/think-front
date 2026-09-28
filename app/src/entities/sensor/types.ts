export interface Sensor {
  id: number; // внешний "ид_канала_данных"
  objectId: number;
  picketId: number | null;
  system: string;
  sType: string;
  tag: string | null;
  name: string;
  isActive: boolean;
  // Текущего значения/состояния здесь нет намеренно — показания идут из
  // воронки tf-funnel (окно «Логи»), а не из карточки датчика.
}

// Пара «подсистема — тип», которая уже встречается у датчиков (GET /sensors/types).
export interface SensorTypeOption {
  system: string;
  sType: string;
}

export interface CreateSensorRequest {
  id: number;
  objectId: number;
  picketId?: number | null;
  system: string;
  sType: string;
  tag?: string | null;
  name: string;
}

export interface UpdateSensorRequest {
  picketId?: number | null;
  name: string;
  tag?: string | null;
  isActive: boolean;
}
