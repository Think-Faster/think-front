export type ObjectStatus = 'normal' | 'watch' | 'alarm' | 'offline';

// Название MonitoredObject, а не Object — чтобы не затенять глобальный
// встроенный тип Object.
export interface MonitoredObject {
  id: number; // внешний id из справочника системы мониторинга, не генерируется BFF
  level: number;
  parentId: number | null;
  kind: string;
  name: string;
  address: string | null;
  geometryGeoJson: string | null;
  status: ObjectStatus;
  statusAt: string;
}

// Слой карты (/objects/{id}/layers): geoJson — строка с FeatureCollection в
// условных метрах схемы (tf.crs = 'schematic-m'), не в широте/долготе.
export interface MapLayer {
  id: string;
  level: number;
  objectId: number | null;
  kind: string;
  geoJson: string;
  updatedAt: string;
}

export interface CreateObjectRequest {
  id: number;
  level: number;
  parentId?: number | null;
  kind: string;
  name: string;
  address?: string | null;
  geometryGeoJson?: string | null;
}

export interface UpdateObjectRequest {
  name: string;
  address?: string | null;
  geometryGeoJson?: string | null;
}
