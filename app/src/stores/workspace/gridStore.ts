import { create } from 'zustand';

import { windowRegistry } from '../../core/registry/windowRegistry';
import {
  DEFAULT_COLUMN_SIZE,
  DEFAULT_ROW_SIZE,
  MAX_AUTO_COLUMNS,
  MIN_TRACK_SIZE,
} from '../../core/workspace/gridConfig';
import { localStorageGridStorage } from '../../core/workspace/gridStorage';
import { GRID_STATE_VERSION, GridCell, GridState, GridTrack } from '../../core/workspace/gridTypes';

function nextTrackId(prefix: 'col' | 'row'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyGrid(): GridState {
  return { version: GRID_STATE_VERSION, columns: [], rows: [], cells: [] };
}

function bootstrapGrid(): GridState {
  const column: GridTrack = { id: nextTrackId('col'), size: DEFAULT_COLUMN_SIZE };
  const row: GridTrack = { id: nextTrackId('row'), size: DEFAULT_ROW_SIZE };

  return {
    version: GRID_STATE_VERSION,
    columns: [column],
    rows: [row],
    cells: [{ columnId: column.id, rowId: row.id, windowId: null }],
  };
}

// Затравка первой сетки, когда localStorage ещё пуст, не может просто
// splice-нуть в пустые columns/rows — insertColumnAt/insertRowAt создают
// клетки, проходя по уже существующим строкам/колонкам, поэтому пустой
// сетке сперва нужна ровно одна колонка и одна строка разом.
function withBootstrap(grid: GridState): GridState {
  return grid.columns.length === 0 || grid.rows.length === 0 ? bootstrapGrid() : grid;
}

function findCell(grid: GridState, columnId: string, rowId: string): GridCell | undefined {
  return grid.cells.find(cell => cell.columnId === columnId && cell.rowId === rowId);
}

function findFirstEmptyCell(grid: GridState): GridCell | undefined {
  for (const row of grid.rows) {
    for (const column of grid.columns) {
      const cell = findCell(grid, column.id, row.id);
      if (cell && cell.windowId === null) {
        return cell;
      }
    }
  }
  return undefined;
}

function findCellByWindowId(grid: GridState, windowId: string): GridCell | undefined {
  return grid.cells.find(cell => cell.windowId === windowId);
}

function insertColumnAt(grid: GridState, index: number): { grid: GridState; columnId: string } {
  const column: GridTrack = { id: nextTrackId('col'), size: DEFAULT_COLUMN_SIZE };
  const columns = [...grid.columns];
  columns.splice(index, 0, column);

  const newCells: GridCell[] = grid.rows.map(row => ({
    columnId: column.id,
    rowId: row.id,
    windowId: null,
  }));

  return { grid: { ...grid, columns, cells: [...grid.cells, ...newCells] }, columnId: column.id };
}

function insertRowAt(grid: GridState, index: number): { grid: GridState; rowId: string } {
  const row: GridTrack = { id: nextTrackId('row'), size: DEFAULT_ROW_SIZE };
  const rows = [...grid.rows];
  rows.splice(index, 0, row);

  const newCells: GridCell[] = grid.columns.map(column => ({
    columnId: column.id,
    rowId: row.id,
    windowId: null,
  }));

  return { grid: { ...grid, rows, cells: [...grid.cells, ...newCells] }, rowId: row.id };
}

// Ставит windowId в клетку (columnId, rowId) и одновременно чистит клетку,
// где он стоял раньше (если стоял) — окно не может оказаться в двух местах
// сразу.
function withWindowPlaced(grid: GridState, windowId: string, columnId: string, rowId: string): GridState {
  const cells = grid.cells.map(cell => {
    if (cell.windowId === windowId) {
      return { ...cell, windowId: null };
    }
    if (cell.columnId === columnId && cell.rowId === rowId) {
      return { ...cell, windowId };
    }
    return cell;
  });

  return { ...grid, cells };
}

function withWindowRemoved(grid: GridState, windowId: string): GridState {
  return {
    ...grid,
    cells: grid.cells.map(cell => (cell.windowId === windowId ? { ...cell, windowId: null } : cell)),
  };
}

// Левый-направо, сверху-вниз скан; если свободных клеток нет — новая
// колонка справа, а если упёрлись в MAX_AUTO_COLUMNS — новая строка снизу.
function computeAutoPlacement(grid: GridState, windowId: string): GridState {
  const next = withBootstrap(grid);

  const empty = findFirstEmptyCell(next);
  if (empty) {
    return withWindowPlaced(next, windowId, empty.columnId, empty.rowId);
  }

  if (next.columns.length < MAX_AUTO_COLUMNS) {
    const { grid: grown, columnId } = insertColumnAt(next, next.columns.length);
    return withWindowPlaced(grown, windowId, columnId, grown.rows[0].id);
  }

  const { grid: grown, rowId } = insertRowAt(next, next.rows.length);
  return withWindowPlaced(grown, windowId, grown.columns[0].id, rowId);
}

// Ручной оверрайд через drag-and-drop на существующее окно: новая колонка
// сразу справа от него (direction 'right') или новая строка сразу под ним
// ('bottom') — в отличие от computeAutoPlacement, MAX_AUTO_COLUMNS
// намеренно не проверяется, это явный выбор пользователя, а не эвристика.
function computeOverridePlacement(
  grid: GridState,
  windowId: string,
  targetWindowId: string,
  direction: 'right' | 'bottom'
): GridState {
  const targetCell = findCellByWindowId(grid, targetWindowId);
  if (!targetCell) {
    return computeAutoPlacement(grid, windowId);
  }

  if (direction === 'right') {
    const index = grid.columns.findIndex(column => column.id === targetCell.columnId);
    const { grid: grown, columnId } = insertColumnAt(grid, index + 1);
    return withWindowPlaced(grown, windowId, columnId, targetCell.rowId);
  }

  const index = grid.rows.findIndex(row => row.id === targetCell.rowId);
  const { grid: grown, rowId } = insertRowAt(grid, index + 1);
  return withWindowPlaced(grown, windowId, targetCell.columnId, rowId);
}

function initialGrid(): GridState {
  const persisted = localStorageGridStorage.load();
  if (persisted) {
    return persisted;
  }

  let grid = emptyGrid();
  for (const definition of windowRegistry) {
    if (definition.defaultOpen) {
      grid = computeAutoPlacement(grid, definition.id);
    }
  }
  return grid;
}

interface GridStoreState {
  grid: GridState;
  placeWindowAuto: (windowId: string) => void;
  placeWindowAt: (windowId: string, targetWindowId: string, direction: 'right' | 'bottom') => void;
  removeWindow: (windowId: string) => void;
  resizeColumn: (columnId: string, size: number) => void;
  resizeRow: (rowId: string, size: number) => void;
  addColumn: () => string | null;
  addRow: () => string;
}

export const useGridStore = create<GridStoreState>((set, get) => ({
  grid: initialGrid(),

  placeWindowAuto: windowId => set(state => ({ grid: computeAutoPlacement(state.grid, windowId) })),

  placeWindowAt: (windowId, targetWindowId, direction) =>
    set(state => ({ grid: computeOverridePlacement(state.grid, windowId, targetWindowId, direction) })),

  removeWindow: windowId => set(state => ({ grid: withWindowRemoved(state.grid, windowId) })),

  resizeColumn: (columnId, size) =>
    set(state => ({
      grid: {
        ...state.grid,
        columns: state.grid.columns.map(column =>
          column.id === columnId ? { ...column, size: Math.max(MIN_TRACK_SIZE, size) } : column
        ),
      },
    })),

  resizeRow: (rowId, size) =>
    set(state => ({
      grid: {
        ...state.grid,
        rows: state.grid.rows.map(row =>
          row.id === rowId ? { ...row, size: Math.max(MIN_TRACK_SIZE, size) } : row
        ),
      },
    })),

  addColumn: () => {
    const current = withBootstrap(get().grid);

    if (current !== get().grid) {
      set({ grid: current });
      return current.columns[0].id;
    }

    if (current.columns.length >= MAX_AUTO_COLUMNS) {
      return null;
    }

    const { grid, columnId } = insertColumnAt(current, current.columns.length);
    set({ grid });
    return columnId;
  },

  addRow: () => {
    const current = withBootstrap(get().grid);

    if (current !== get().grid) {
      set({ grid: current });
      return current.rows[0].id;
    }

    const { grid, rowId } = insertRowAt(current, current.rows.length);
    set({ grid });
    return rowId;
  },
}));

useGridStore.subscribe(state => {
  localStorageGridStorage.save(state.grid);
});
