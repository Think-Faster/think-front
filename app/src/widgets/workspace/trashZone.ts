import { useGridStore } from '../../stores/workspace/gridStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { closeWindow, openWindow } from '../../stores/workspace/workspaceCommands';

// Общая механика перетаскивания окна за шапку и раздела из сайдбара:
// мусорка (§7.3 — окно в CLOSED) и ячейка сегментной сетки как цели броска.
// Цели ищутся геометрией (getBoundingClientRect / elementFromPoint), без
// реестра ref-ов между сайдбаром и холстом.

const DRAG_THRESHOLD = 6;

let trashElement: HTMLElement | null = null;
let canvasElement: HTMLElement | null = null;
let highlightedCell: HTMLElement | null = null;

export function registerTrash(element: HTMLElement | null) {
  trashElement = element;
}

export function registerCanvas(element: HTMLElement | null) {
  canvasElement = element;
}

export function trashRect(): DOMRect | null {
  return trashElement?.getBoundingClientRect() ?? null;
}

export function isOverTrash(clientX: number, clientY: number): boolean {
  const rect = trashRect();
  if (!rect) {
    return false;
  }
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

interface CellTarget {
  columnId: string;
  rowId: string;
}

function cellAt(clientX: number, clientY: number): { element: HTMLElement; target: CellTarget } | null {
  const element = document.elementFromPoint(clientX, clientY)?.closest('[data-cell]') as HTMLElement | null;
  const columnId = element?.dataset.columnId;
  const rowId = element?.dataset.rowId;
  if (!element || !columnId || !rowId) {
    return null;
  }
  return { element, target: { columnId, rowId } };
}

function highlightCell(element: HTMLElement | null) {
  if (highlightedCell === element) {
    return;
  }
  highlightedCell?.classList.remove('drop-target');
  element?.classList.add('drop-target');
  highlightedCell = element;
}

export function clearDropHighlight() {
  highlightCell(null);
}

export interface DragSession {
  windowId: string;
  title: string;
  source: 'window' | 'sidebar';
  startX: number;
  startY: number;
  moved: boolean;
}

export function startDragSession(
  windowId: string,
  title: string,
  source: 'window' | 'sidebar',
  clientX: number,
  clientY: number
): DragSession {
  return { windowId, title, source, startX: clientX, startY: clientY, moved: false };
}

// true — порог пройден и идёт перетаскивание; false — ещё похоже на клик.
export function updateDragSession(session: DragSession, clientX: number, clientY: number, showGhost: boolean): boolean {
  if (!session.moved && Math.hypot(clientX - session.startX, clientY - session.startY) < DRAG_THRESHOLD) {
    return false;
  }
  session.moved = true;

  const overTrash = session.source === 'window' && isOverTrash(clientX, clientY);
  const overlap = useLayoutStore.getState().overlap;
  highlightCell(!overlap && !overTrash && showGhost ? cellAt(clientX, clientY)?.element ?? null : null);

  useLayoutStore.getState().setDrag({
    windowId: session.windowId,
    title: session.title,
    source: session.source,
    x: clientX,
    y: clientY,
    overTrash,
    showGhost,
  });
  return true;
}

// Бросок в сегментном режиме: мусорка закрывает окно, ячейка — обмен местами
// (окно из сетки) или замена стоявшего там окна (раздел из сайдбара).
// Возвращает true, если бросок что-то сделал.
export function finishGridDrop(session: DragSession, clientX: number, clientY: number): boolean {
  clearDropHighlight();
  useLayoutStore.getState().setDrag(null);

  if (session.source === 'window' && isOverTrash(clientX, clientY)) {
    closeWindow(session.windowId);
    return true;
  }

  const cell = cellAt(clientX, clientY);
  if (!cell) {
    return false;
  }

  const grid = useGridStore.getState();
  const displaced = grid.grid.cells.find(
    item => item.columnId === cell.target.columnId && item.rowId === cell.target.rowId
  )?.windowId;
  const fromGrid = grid.grid.cells.some(item => item.windowId === session.windowId);

  grid.placeWindowInCell(session.windowId, cell.target.columnId, cell.target.rowId);
  useLayoutStore.getState().setMinimized(session.windowId, false);
  if (displaced && displaced !== session.windowId && !fromGrid) {
    useLayoutStore.getState().setMinimized(displaced, false);
  }
  return true;
}

// Бросок раздела из сайдбара в свободном режиме — окно открывается в точке
// броска (координаты холста). Бросок обратно на шторку ничего не делает.
export function finishFreeSidebarDrop(session: DragSession, clientX: number, clientY: number) {
  useLayoutStore.getState().setDrag(null);
  if (document.elementFromPoint(clientX, clientY)?.closest('.sidebar')) {
    return;
  }
  if (!canvasElement) {
    openWindow(session.windowId);
    return;
  }
  const rect = canvasElement.getBoundingClientRect();
  openWindow(session.windowId, {
    x: Math.round(clientX - rect.left - 40),
    y: Math.max(0, Math.round(clientY - rect.top - 16)),
  });
}

export function cancelDrag() {
  clearDropHighlight();
  useLayoutStore.getState().setDrag(null);
}
