import { GRID_STATE_VERSION, GridState } from './gridTypes';

const STORAGE_KEY = 'kontur_grid_v1';

// Узкая граница ввода-вывода — сейчас только localStorage, но вызывающий
// код (gridStore) обращается только к load()/save(), поэтому переезд на
// бэкенд позже — это замена одной реализации, а не правка стора.
export interface GridStorage {
  load(): GridState | null;
  save(state: GridState): void;
}

export const localStorageGridStorage: GridStorage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as GridState;
      return parsed.version === GRID_STATE_VERSION ? parsed : null;
    } catch {
      return null;
    }
  },

  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // хранилище недоступно (приватный режим, квота) — раскладка просто не сохранится
    }
  },
};
