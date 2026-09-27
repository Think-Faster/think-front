import { create } from 'zustand';

const STORAGE_KEY = 'kontur_layout_v1';

// То, что переживает перезагрузку: режим, шторка, свёрнутые окна. Позже
// уезжает в PUT /workspaces/{id} (доменный документ §7.1) — ручки в BFF пока
// нет, поэтому localStorage.
interface PersistedLayout {
  overlap: boolean;
  sidebarCollapsed: boolean;
  minimized: string[];
  seeded: boolean;
}

// Перетаскивание окна за шапку или раздела из сайдбара: призрак у курсора
// и признак «над мусоркой» для подсветки зоны удаления.
export interface WindowDrag {
  windowId: string;
  title: string;
  source: 'window' | 'sidebar';
  x: number;
  y: number;
  overTrash: boolean;
  showGhost: boolean;
}

function load(): PersistedLayout {
  const defaults: PersistedLayout = { overlap: true, sidebarCollapsed: false, minimized: [], seeded: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<PersistedLayout>) } : defaults;
  } catch {
    return defaults;
  }
}

interface LayoutStoreState extends PersistedLayout {
  reloadNonce: Record<string, number>;
  drag: WindowDrag | null;
  hint: string | null;
  setOverlapRaw: (overlap: boolean) => void;
  toggleSidebar: () => void;
  setMinimized: (windowId: string, minimized: boolean) => void;
  markSeeded: () => void;
  reload: (windowId: string) => void;
  setDrag: (drag: WindowDrag | null) => void;
  setHint: (hint: string | null) => void;
}

export const useLayoutStore = create<LayoutStoreState>(set => ({
  ...load(),
  reloadNonce: {},
  drag: null,
  hint: null,

  setOverlapRaw: overlap => set({ overlap }),

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setMinimized: (windowId, minimized) =>
    set(state => {
      const has = state.minimized.includes(windowId);
      if (has === minimized) {
        return state;
      }
      return {
        minimized: minimized ? [...state.minimized, windowId] : state.minimized.filter(id => id !== windowId),
      };
    }),

  markSeeded: () => set({ seeded: true }),

  reload: windowId =>
    set(state => ({ reloadNonce: { ...state.reloadNonce, [windowId]: (state.reloadNonce[windowId] ?? 0) + 1 } })),

  setDrag: drag => set({ drag }),

  setHint: hint => set({ hint }),
}));

useLayoutStore.subscribe(state => {
  const persisted: PersistedLayout = {
    overlap: state.overlap,
    sidebarCollapsed: state.sidebarCollapsed,
    minimized: state.minimized,
    seeded: state.seeded,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // хранилище недоступно — раскладка просто не сохранится
  }
});
