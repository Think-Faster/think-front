import { create } from 'zustand';

import { windowRegistry } from '../../core/registry/windowRegistry';

export interface WindowRuntimeState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
  z: number;
}

interface WindowsState {
  windows: WindowRuntimeState[];
  toggleWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, patch: Partial<WindowRuntimeState>) => void;
  applyOpenState: (openIds: string[], activeId?: string) => void;
}

const STORAGE_KEY = 'kontur_layout_v3';

function loadPersisted(): WindowRuntimeState[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function initialWindows(): WindowRuntimeState[] {
  const persisted = loadPersisted();

  return windowRegistry.map(definition => {
    const saved = persisted?.find(window => window.id === definition.id);
    return saved ?? { id: definition.id, ...definition.defaultView };
  });
}

export const useWindowsStore = create<WindowsState>(set => ({
  windows: initialWindows(),

  toggleWindow: id =>
    set(state => ({
      windows: state.windows.map(window =>
        window.id === id ? { ...window, open: !window.open } : window
      ),
    })),

  focusWindow: id =>
    set(state => {
      const maxZ = Math.max(...state.windows.map(window => window.z));

      return {
        windows: state.windows.map(window =>
          window.id === id ? { ...window, z: maxZ + 1 } : window
        ),
      };
    }),

  updateWindow: (id, patch) =>
    set(state => ({
      windows: state.windows.map(window => (window.id === id ? { ...window, ...patch } : window)),
    })),

  applyOpenState: (openIds, activeId) =>
    set(state => {
      const maxZ = Math.max(...state.windows.map(window => window.z));

      return {
        windows: state.windows.map(window => ({
          ...window,
          open: openIds.includes(window.id),
          z: window.id === activeId ? maxZ + 1 : window.z,
        })),
      };
    }),
}));

useWindowsStore.subscribe(state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.windows));
  } catch {
    // storage unavailable (private mode, quota) — layout simply won't persist
  }
});
