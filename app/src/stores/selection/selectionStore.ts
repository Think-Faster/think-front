import { create } from 'zustand';

// Выбранный объект, общий для окон: клик по участку на карте выставляет его,
// «История объектов» и «Журнал данных» по нему фильтруются.
interface SelectionStoreState {
  objectId: number | null;
  setObjectId: (objectId: number | null) => void;
}

export const useSelectionStore = create<SelectionStoreState>(set => ({
  objectId: null,
  setObjectId: objectId => set({ objectId }),
}));
