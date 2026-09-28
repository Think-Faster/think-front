import { create } from 'zustand';

const STORAGE_KEY = 'kontur_theme_v1';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export type Theme = 'light' | 'dark';

// Тема интерфейса. Пока пользователь не выбрал сам, действует тема системы
// (styles/index.css: @media prefers-color-scheme); выбор ставит
// <html data-theme> и переживает перезагрузку. Цвета — только токены :root.
function loadChoice(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function applyChoice(choice: Theme | null) {
  const root = document.documentElement;
  if (choice) {
    root.dataset.theme = choice;
  } else {
    delete root.dataset.theme;
  }
}

interface ThemeStoreState {
  // Явный выбор пользователя; null — как в системе.
  choice: Theme | null;
  // Тема, которая сейчас на экране.
  theme: Theme;
  toggle: () => void;
}

const initialChoice = loadChoice();
applyChoice(initialChoice);

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  choice: initialChoice,
  theme: initialChoice ?? systemTheme(),

  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // хранилище недоступно — тема продержится до перезагрузки
    }
    set({ choice: next, theme: next });
  },
}));

// Без явного выбора тема следует за системой и на лету.
if (typeof window.matchMedia === 'function') {
  window.matchMedia(DARK_QUERY).addEventListener?.('change', () => {
    if (!useThemeStore.getState().choice) {
      useThemeStore.setState({ theme: systemTheme() });
    }
  });
}
