import { create } from 'zustand';

import { FactAlert } from '../../entities/factAlert/types';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';

// Просьба «покажи объект на карте» из других окон (заявка, история).
// Отдельно от выбора: если объект уже выбран, повторный выбор ничего не
// меняет, а просьба — с новым номером seq — карта исполнит ещё раз.
// route — эпизод, чей маршрут нарушителя показать поверх карты, даже если он
// уже не идёт (журнал данных).
interface MapRequestState {
  objectId: number | null;
  route: FactAlert | null;
  seq: number;
  show: (objectId: number, route?: FactAlert) => void;
}

export const useMapRequest = create<MapRequestState>(set => ({
  objectId: null,
  route: null,
  seq: 0,
  show: (objectId, route) => set(state => ({ objectId, route: route ?? null, seq: state.seq + 1 })),
}));

export function showObjectOnMap(objectId: number) {
  useSelectionStore.getState().setObjectId(objectId);
  useMapRequest.getState().show(objectId);
  openWindow('map');
}

export function showRouteOnMap(alert: FactAlert) {
  useSelectionStore.getState().setObjectId(alert.objectId);
  useMapRequest.getState().show(alert.objectId, alert);
  openWindow('map');
}
