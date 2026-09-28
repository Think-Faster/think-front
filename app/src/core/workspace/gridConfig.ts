// Временные, подобранные на глаз значения — если понадобится другая сетка
// или другие размеры окон, менять только здесь.

// Сегментный режим (доменный документ §7.1): 4, 6, 8 или 10 ячеек, по
// умолчанию 6. Ячеек всегда две строки, колонок — segments / 2.
export const SEGMENT_OPTIONS = [4, 6, 8, 10] as const;
export const DEFAULT_SEGMENTS = 6;
export const GRID_ROWS = 2;
export const MIN_TRACK_SIZE = 160; // px — нижний предел при перетаскивании разделителя
export const DIVIDER_SIZE = 8; // px — ширина/высота перетаскиваемого разделителя между треками

// Свободный режим («внахлёст»): размер нового окна и шаг каскада.
export const FREE_WINDOW_WIDTH = 440;
export const FREE_WINDOW_HEIGHT = 380;
export const FREE_MIN_WIDTH = 260;
export const FREE_MIN_HEIGHT = 160;
export const FREE_CASCADE_STEP = 32;
export const FREE_CASCADE_LIMIT = 8;
