import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
  z: number;
}

interface WindowContextValue {
  windows: WindowState[];

  toggleWindow: (
    id: string
  ) => void;

  focusWindow: (
    id: string
  ) => void;

  updateWindow: (
    id: string,
    data: Partial<WindowState>
  ) => void;
}

const STORAGE_KEY =
  'kontur_layout_v3';

const defaults: WindowState[] = [
  {
    id: 'queue',
    title: 'Очередь прогнозов',
    x: 20,
    y: 20,
    width: 300,
    height: 430,
    open: true,
    z: 10,
  },
  {
    id: 'map',
    title: 'Карта',
    x: 336,
    y: 20,
    width: 520,
    height: 430,
    open: true,
    z: 11,
  },
  {
    id: 'pred',
    title: 'Карточка прогноза',
    x: 872,
    y: 20,
    width: 340,
    height: 560,
    open: true,
    z: 12,
  },
  {
    id: 'schem',
    title: 'Схема объекта',
    x: 336,
    y: 466,
    width: 520,
    height: 340,
    open: false,
    z: 13,
  },
  {
    id: 'timeline',
    title: 'История объекта',
    x: 336,
    y: 466,
    width: 420,
    height: 380,
    open: false,
    z: 14,
  },
  {
    id: 'object',
    title: 'Карточка объекта',
    x: 20,
    y: 466,
    width: 640,
    height: 400,
    open: false,
    z: 15,
  },
  {
    id: 'stream',
    title: 'Поток данных',
    x: 20,
    y: 466,
    width: 300,
    height: 260,
    open: true,
    z: 16,
  },
  {
    id: 'log',
    title: 'Журнал действий',
    x: 1150,
    y: 466,
    width: 340,
    height: 300,
    open: true,
    z: 17,
  },
];

const WindowContext =
  createContext<WindowContextValue | null>(
    null
  );

export function WindowManager({
  children,
}: {
  children: ReactNode;
}) {
  const [windows, setWindows] =
    useState<WindowState[]>(() => {
      try {
        const saved =
          localStorage.getItem(
            STORAGE_KEY
          );

        if (!saved) {
          return defaults;
        }

        return JSON.parse(saved);
      } catch {
        return defaults;
      }
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(windows)
    );
  }, [windows]);

  function toggleWindow(id: string) {
    setWindows(current =>
      current.map(window =>
        window.id === id
          ? {
              ...window,
              open: !window.open,
            }
          : window
      )
    );
  }

  function focusWindow(id: string) {
    setWindows(current => {
      const maxZ = Math.max(
        ...current.map(x => x.z)
      );

      return current.map(window =>
        window.id === id
          ? {
              ...window,
              z: maxZ + 1,
            }
          : window
      );
    });
  }

  function updateWindow(
    id: string,
    data: Partial<WindowState>
  ) {
    setWindows(current =>
      current.map(window =>
        window.id === id
          ? {
              ...window,
              ...data,
            }
          : window
      )
    );
  }

  return (
    <WindowContext.Provider
      value={{
        windows,
        toggleWindow,
        focusWindow,
        updateWindow,
      }}
    >
      {children}
    </WindowContext.Provider>
  );
}

export function useWindowManager() {
  const context =
    useContext(WindowContext);

  if (!context) {
    throw new Error(
      'useWindowManager must be used inside WindowManager'
    );
  }

  return context;
}