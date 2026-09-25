// Бампается при несовместимом изменении формы GridState — gridStorage
// отбрасывает сохранённое состояние с другой версией вместо падения на
// JSON, не совпадающем по форме.
export const GRID_STATE_VERSION = 1;

export interface GridTrack {
  id: string;
  size: number; // px
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
