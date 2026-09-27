import { create } from 'zustand';

import { DEFAULT_SEGMENTS, GRID_ROWS } from '../../core/workspace/gridConfig';
import { localStorageGridStorage } from '../../core/workspace/gridStorage';
import { GRID_STATE_VERSION, GridCell, GridState, GridTrack } from '../../core/workspace/gridTypes';

function nextTrackId(prefix: 'col' | 'row'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Сегментный режим (доменный документ §7.3): фиксированная матрица
// segments / GRID_ROWS колонок × GRID_ROWS строк, ячейки одинаковые (1fr).
// Окна раскладываются по порядку слева направо, сверху вниз.
function buildGrid(segments: number, windowIds: string[]): GridState {
  const columnCount = Math.max(1, Math.round(segments / GRID_ROWS));
  const columns: GridTrack[] = Array.from({ length: columnCount }, () => ({ id: nextTrackId('col'), size: 1 }));
  const rows: GridTrack[] = Array.from({ length: GRID_ROWS }, () => ({ id: nextTrackId('row'), size: 1 }));

  const cells: GridCell[] = [];
  let index = 0;
  for (const row of rows) {
    for (const column of columns) {
      cells.push({ columnId: column.id, rowId: row.id, windowId: windowIds[index] ?? null });
      index += 1;
    }
  }

  return { version: GRID_STATE_VERSION, columns, rows, cells };
}

function findCell(grid: GridState, columnId: string, rowId: string): GridCell | undefined {
  return grid.cells.find(cell => cell.columnId === columnId && cell.rowId === rowId);
}

function findCellByWindowId(grid: GridState, windowId: string): GridCell | undefined {
  return grid.cells.find(cell => cell.windowId === windowId);
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

export function segmentCount(grid: GridState): number {
  return grid.columns.length * grid.rows.length;
}

// Окна сетки в порядке ячеек (слева направо, сверху вниз) — этим же порядком
// они переезжают в новую матрицу при смене числа сегментов и в свободный
// режим при переключении «внахлёст».
export function orderedWindowIds(grid: GridState): string[] {
  const ids: string[] = [];
  for (const row of grid.rows) {
    for (const column of grid.columns) {
      const windowId = findCell(grid, column.id, row.id)?.windowId;
      if (windowId) {
        ids.push(windowId);
      }
    }
  }
  return ids;
}

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

// Перенос окна в ячейку. Окно из сетки меняется местами с тем, что стояло в
// ячейке (обмен segment_index, §7.3); окно не из сетки — например,
// перетащенное из сайдбара — занимает ячейку, а стоявшее там закрывается.
function withWindowMovedToCell(grid: GridState, windowId: string, columnId: string, rowId: string): GridState {
  const source = findCellByWindowId(grid, windowId);
  const target = findCell(grid, columnId, rowId);

  if (!target || source === target) {
    return grid;
  }

  if (!source) {
    return withWindowPlaced(grid, windowId, columnId, rowId);
  }

  const displaced = target.windowId;
  return {
    ...grid,
    cells: grid.cells.map(cell => {
      if (cell === target) {
        return { ...cell, windowId };
      }
      if (cell === source) {
        return { ...cell, windowId: displaced };
      }
      return cell;
    }),
  };
}

function initialGrid(): GridState {
  // Окна по умолчанию (defaultOpen в реестре) раскладывает WorkspaceCanvas
  // при первом входе — стор не импортирует реестр окон, иначе цикл
  // импортов: реестр → окна → команды раскладки → стор → реестр.
  return localStorageGridStorage.load() ?? buildGrid(DEFAULT_SEGMENTS, []);
}

interface GridStoreState {
  grid: GridState;
  // false — свободных ячеек нет, решает вызывающий код (workspaceCommands).
  placeWindowAuto: (windowId: string) => boolean;
  placeWindowInCell: (windowId: string, columnId: string, rowId: string) => void;
  removeWindow: (windowId: string) => void;
  // false — окон больше, чем ячеек в новой матрице; сетка не меняется.
  setSegments: (segments: number) => boolean;
  // Полная замена набора окон (переход из свободного режима) — лишние,
  // которым не хватило ячеек, отбрасываются.
  setWindows: (windowIds: string[]) => void;
  resizeTracks: (axis: 'column' | 'row', firstId: string, secondId: string, firstSize: number, secondSize: number) => void;
}

export const useGridStore = create<GridStoreState>((set, get) => ({
  grid: initialGrid(),

  placeWindowAuto: windowId => {
    const { grid } = get();
    if (findCellByWindowId(grid, windowId)) {
      return true;
    }

    const empty = findFirstEmptyCell(grid);
    if (!empty) {
      return false;
    }

    set({ grid: withWindowPlaced(grid, windowId, empty.columnId, empty.rowId) });
    return true;
  },

  placeWindowInCell: (windowId, columnId, rowId) =>
    set(state => ({ grid: withWindowMovedToCell(state.grid, windowId, columnId, rowId) })),

  removeWindow: windowId => set(state => ({ grid: withWindowRemoved(state.grid, windowId) })),

  setSegments: segments => {
    const windowIds = orderedWindowIds(get().grid);
    if (windowIds.length > segments) {
      return false;
    }

    set({ grid: buildGrid(segments, windowIds) });
    return true;
  },

  setWindows: windowIds => {
    const segments = segmentCount(get().grid);
    set({ grid: buildGrid(segments, windowIds.slice(0, segments)) });
  },

  resizeTracks: (axis, firstId, secondId, firstSize, secondSize) =>
    set(state => {
      const key = axis === 'column' ? 'columns' : 'rows';
      return {
        grid: {
          ...state.grid,
          [key]: state.grid[key].map(track => {
            if (track.id === firstId) {
              return { ...track, size: firstSize };
            }
            if (track.id === secondId) {
              return { ...track, size: secondSize };
            }
            return track;
          }),
        },
      };
    }),
}));

useGridStore.subscribe(state => {
  localStorageGridStorage.save(state.grid);
});
