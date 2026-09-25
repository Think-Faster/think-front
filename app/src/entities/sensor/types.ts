export interface Sensor {
  id: number; // внешний "ид_канала_данных"
  objectId: number;
  picketId: string | null;
  system: string;
  sType: string;
  tag: string | null;
  name: string;
  isActive: boolean;
  // Текущего значения/состояния здесь нет намеренно — это снимок потока
  // tf-funnel (ещё не подключён), а не часть карточки датчика.
}

export interface CreateSensorRequest {
  id: number;
  objectId: number;
  picketId?: string | null;
  system: string;
  sType: string;
  tag?: string | null;
  name: string;
}

export interface UpdateSensorRequest {
  picketId?: string | null;
  name: string;
  tag?: string | null;
  isActive: boolean;
}
