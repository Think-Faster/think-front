import { create } from 'zustand';

const STORAGE_KEY = 'kontur_instances_v1';

// Что показывает копия окна (доменный документ §7.2, window.context): объект
// для карты, логов и журналов, id сущности для карточки (:id её маршрута).
// Первый экземпляр контекста не хранит — он следует общему выбору и адресу.
export interface InstanceContext {
  objectId?: number | null;
  entityId?: string;
}

function load(): Record<string, InstanceContext> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, InstanceContext>) : {};
  } catch {
    return {};
  }
}

interface InstanceStoreState {
  contexts: Record<string, InstanceContext>;
  setContext: (windowId: string, patch: InstanceContext) => void;
  clearContext: (windowId: string) => void;
}

export const useInstanceStore = create<InstanceStoreState>(set => ({
  contexts: load(),

  setContext: (windowId, patch) =>
    set(state => ({ contexts: { ...state.contexts, [windowId]: { ...state.contexts[windowId], ...patch } } })),

  clearContext: windowId =>
    set(state => {
      if (!(windowId in state.contexts)) {
        return state;
      }
      const { [windowId]: _removed, ...rest } = state.contexts;
      return { contexts: rest };
    }),
}));

useInstanceStore.subscribe(state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.contexts));
  } catch {
    // хранилище недоступно — копии после перезагрузки откроются пустыми
  }
});
