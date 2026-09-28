// Бампается при несовместимом изменении формы GridState — gridStorage
// отбрасывает сохранённое состояние с другой версией вместо падения на
// JSON, не совпадающем по форме. v2: размер трека — доля (fr), а не px;
// сетка фиксированная, segments = columns × rows.
export const GRID_STATE_VERSION = 2;

export interface GridTrack {
  id: string;
  size: number; // fr — доля свободного места
}

export interface GridCell {
  columnId: string;
  rowId: string;
  windowId: string | null;
}

export interface GridState {
  version: number;
  columns: GridTrack[];
  rows: GridTrack[];
  cells: GridCell[]; // dense: one entry per (columnId, rowId) pair
}
