// Пикет — отметка вдоль коллектора (ПК0, ПК1…), к которой привязан датчик
// (sensors.picket_id). id — bigint из pickets, в JSON число.
export interface Picket {
  id: number;
  objectId: number;
  code: string;
  ordinal: number;
  geometryGeoJson: string | null;
}
