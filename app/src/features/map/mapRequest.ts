import { create } from 'zustand';

import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';

// Просьба «покажи объект на карте» из других окон (заявка, история).
// Отдельно от выбора: если объект уже выбран, повторный выбор ничего не
// меняет, а просьба — с новым номером seq — карта исполнит ещё раз.
interface MapRequestState {
  objectId: number | null;
  seq: number;
  show: (objectId: number) => void;
}

export const useMapRequest = create<MapRequestState>(set => ({
  objectId: null,
  seq: 0,
  show: objectId => set(state => ({ objectId, seq: state.seq + 1 })),
}));

export function showObjectOnMap(objectId: number) {
  useSelectionStore.getState().setObjectId(objectId);
  useMapRequest.getState().show(objectId);
  openWindow('map');
}
