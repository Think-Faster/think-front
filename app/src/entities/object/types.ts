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
