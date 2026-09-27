import { create } from 'zustand';

import {
  FREE_CASCADE_LIMIT,
  FREE_CASCADE_STEP,
  FREE_MIN_HEIGHT,
  FREE_MIN_WIDTH,
  FREE_WINDOW_HEIGHT,
  FREE_WINDOW_WIDTH,
} from '../../core/workspace/gridConfig';

const STORAGE_KEY = 'kontur_free_v1';
const FREE_STATE_VERSION = 1;

// Отступ каскада слева — ширина раскрытой шторки сайдбара (240) и зазор:
// шторка лежит поверх холста, и новое окно не должно открываться под ней.
const CASCADE_ORIGIN_X = 264;
const CASCADE_ORIGIN_Y = 24;

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Свободный режим («внахлёст», layout_mode = FREE, §7.2): прямоугольник окна
// и порядок по глубине — последний в order лежит сверху (z).
export interface FreeState {
  version: number;
  rects: Record<string, FreeRect>;
  order: string[];
}

function load(): FreeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FreeState) : null;
    if (parsed && parsed.version === FREE_STATE_VERSION) {
      return parsed;
    }
  } catch {
    // повреждённое или недоступное хранилище — начинаем с пустого холста
  }
  return { version: FREE_STATE_VERSION, rects: {}, order: [] };
}

const TILE_GAP = 24;
const MAX_DEFAULT_WIDTH = 720;
const MAX_DEFAULT_HEIGHT = 720;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Новое окно — в половину свободной ширины экрана (не меньше 440×380).
// Первые окна встают рядом, пока помещаются, дальше — каскадом.
function cascadeRect(index: number): FreeRect {
  const free = window.innerWidth - CASCADE_ORIGIN_X - TILE_GAP;
  const width = Math.round(clamp((free - TILE_GAP) / 2, FREE_WINDOW_WIDTH, MAX_DEFAULT_WIDTH));
  const height = Math.round(
    clamp(window.innerHeight - CASCADE_ORIGIN_Y * 2, FREE_WINDOW_HEIGHT, MAX_DEFAULT_HEIGHT)
  );

  const perRow = Math.max(1, Math.floor((free + TILE_GAP) / (width + TILE_GAP)));
  if (index < perRow) {
    return { x: CASCADE_ORIGIN_X + index * (width + TILE_GAP), y: CASCADE_ORIGIN_Y, width, height };
  }

  const step = (((index - perRow) % FREE_CASCADE_LIMIT) + 1) * FREE_CASCADE_STEP;
  return { x: CASCADE_ORIGIN_X + step, y: CASCADE_ORIGIN_Y + step, width, height };
}

function withOpened(state: FreeState, windowId: string, at?: { x: number; y: number }): FreeState {
  const order = [...state.order.filter(id => id !== windowId), windowId];
  const known = state.rects[windowId];

  let rect: FreeRect;
  if (at) {
    rect = { ...(known ?? cascadeRect(state.order.length)), x: at.x, y: at.y };
  } else if (state.order.includes(windowId) && known) {
    rect = known;
  } else {
    rect = cascadeRect(state.order.length);
  }

  return { ...state, order, rects: { ...state.rects, [windowId]: rect } };
}

interface FreeStoreState {
  free: FreeState;
  // Уже открытое окно поднимается наверх; at — точка, куда бросили раздел.
  open: (windowId: string, at?: { x: number; y: number }) => void;
  close: (windowId: string) => void;
  focus: (windowId: string) => void;
  move: (windowId: string, x: number, y: number) => void;
  resize: (windowId: string, width: number, height: number) => void;
  // Полная замена набора окон (переход из сегментного режима).
  setWindows: (windowIds: string[]) => void;
}

export const useFreeStore = create<FreeStoreState>(set => ({
  free: load(),

  open: (windowId, at) => set(state => ({ free: withOpened(state.free, windowId, at) })),

  close: windowId =>
    set(state => ({ free: { ...state.free, order: state.free.order.filter(id => id !== windowId) } })),

  focus: windowId =>
    set(state => {
      const { order } = state.free;
      if (order[order.length - 1] === windowId || !order.includes(windowId)) {
        return state;
      }
      return { free: { ...state.free, order: [...order.filter(id => id !== windowId), windowId] } };
    }),

  move: (windowId, x, y) =>
    set(state => {
      const rect = state.free.rects[windowId];
      if (!rect) {
        return state;
      }
      return { free: { ...state.free, rects: { ...state.free.rects, [windowId]: { ...rect, x, y } } } };
    }),

  resize: (windowId, width, height) =>
    set(state => {
      const rect = state.free.rects[windowId];
      if (!rect) {
        return state;
      }
      const next = {
        ...rect,
        width: Math.max(FREE_MIN_WIDTH, width),
        height: Math.max(FREE_MIN_HEIGHT, height),
      };
      return { free: { ...state.free, rects: { ...state.free.rects, [windowId]: next } } };
    }),

  setWindows: windowIds =>
    set(state => {
      let free: FreeState = { ...state.free, order: state.free.order.filter(id => windowIds.includes(id)) };
      for (const windowId of windowIds) {
        if (!free.order.includes(windowId)) {
          free = withOpened(free, windowId);
        }
      }
      return { free };
    }),
}));

useFreeStore.subscribe(state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.free));
  } catch {
    // хранилище недоступно (приватный режим, квота) — раскладка просто не сохранится
  }
});
