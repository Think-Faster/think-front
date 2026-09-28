import { SEGMENT_OPTIONS } from '../../core/workspace/gridConfig';
import { definitionIdOf, MAX_WINDOW_INSTANCES, nextInstanceId } from '../../core/workspace/windowInstance';
import { useFreeStore } from './freeStore';
import { orderedWindowIds, segmentCount, useGridStore } from './gridStore';
import { InstanceContext, useInstanceStore } from './instanceStore';
import { useLayoutStore } from './layoutStore';

// Единая точка «открыть/закрыть окно» для обоих режимов раскладки: сайдбар,
// мусорка, ссылки из журналов и карта зовут эти функции и не знают, какой
// режим сейчас включён.

const MAX_SEGMENTS = SEGMENT_OPTIONS[SEGMENT_OPTIONS.length - 1];

export function openWindowIds(): string[] {
  return useLayoutStore.getState().overlap
    ? useFreeStore.getState().free.order
    : orderedWindowIds(useGridStore.getState().grid);
}

export function isWindowOpen(windowId: string): boolean {
  return openWindowIds().includes(windowId);
}

export function openWindow(windowId: string, at?: { x: number; y: number }) {
  const layout = useLayoutStore.getState();
  layout.setMinimized(windowId, false);

  if (layout.overlap) {
    useFreeStore.getState().open(windowId, at);
    return;
  }

  const grid = useGridStore.getState();
  if (grid.placeWindowAuto(windowId)) {
    return;
  }

  // Сетка заполнена — добавляем пару ячеек, пока не упрёмся в 10.
  const next = SEGMENT_OPTIONS.find(option => option > segmentCount(grid.grid));
  if (next && grid.setSegments(next)) {
    useGridStore.getState().placeWindowAuto(windowId);
    return;
  }

  layout.setHint(
    `Все ${MAX_SEGMENTS} ячеек заняты. Закройте окно или перетащите раздел на окно, которое хотите заменить.`
  );
}

// Ещё одно окно того же типа (windowId — любой экземпляр или id записи
// реестра) со своим объектом или карточкой. Копия открывается рядом с
// исходным окном в свободном режиме и в свободной ячейке в сетке.
export function openWindowCopy(windowId: string, context: InstanceContext, at?: { x: number; y: number }) {
  const copyId = nextInstanceId(definitionIdOf(windowId), openWindowIds());
  if (!copyId) {
    useLayoutStore.getState().setHint(`Окон одного раздела — не больше ${MAX_WINDOW_INSTANCES}. Закройте лишнее.`);
    return;
  }
  useInstanceStore.getState().clearContext(copyId);
  useInstanceStore.getState().setContext(copyId, context);
  openWindow(copyId, at);
}

export function closeWindow(windowId: string) {
  useLayoutStore.getState().setMinimized(windowId, false);
  useFreeStore.getState().close(windowId);
  useGridStore.getState().removeWindow(windowId);
  useInstanceStore.getState().clearContext(windowId);
}

export function toggleWindow(windowId: string) {
  if (isWindowOpen(windowId)) {
    closeWindow(windowId);
  } else {
    openWindow(windowId);
  }
}

export function minimizeWindow(windowId: string) {
  useLayoutStore.getState().setMinimized(windowId, true);
}

export function restoreWindow(windowId: string) {
  useLayoutStore.getState().setMinimized(windowId, false);
  if (useLayoutStore.getState().overlap) {
    useFreeStore.getState().focus(windowId);
  }
}

// «Располагать окна внахлёст?» — открытые окна переезжают в другой режим
// тем же набором; в сетке на 10 ячеек лишние закрываются.
export function setOverlap(overlap: boolean) {
  const layout = useLayoutStore.getState();
  if (layout.overlap === overlap) {
    return;
  }

  const windowIds = openWindowIds();
  layout.setOverlapRaw(overlap);

  if (overlap) {
    useFreeStore.getState().setWindows(windowIds);
    return;
  }

  const grid = useGridStore.getState();
  const needed = SEGMENT_OPTIONS.find(option => option >= windowIds.length) ?? MAX_SEGMENTS;
  if (segmentCount(grid.grid) < needed) {
    grid.setSegments(needed);
  }
  useGridStore.getState().setWindows(windowIds);

  if (windowIds.length > MAX_SEGMENTS) {
    layout.setHint(`В сетку поместилось ${MAX_SEGMENTS} окон, остальные закрыты.`);
  }
}

// false — окон больше, чем ячеек в новой сетке: сначала закрыть лишние.
export function setSegments(segments: number): boolean {
  return useGridStore.getState().setSegments(segments);
}

export function useOpenWindowIds(): string[] {
  const overlap = useLayoutStore(state => state.overlap);
  const order = useFreeStore(state => state.free.order);
  const grid = useGridStore(state => state.grid);
  return overlap ? order : orderedWindowIds(grid);
}
