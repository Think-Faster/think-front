import { Box, linePath, nearestOnSegment, Pt, ringPath, thin } from './geo';

// Город под картой района. Настоящей подложки у схемы нет (координаты —
// условные метры), поэтому кварталы, дома, улицы, парки, реку и железную
// дорогу строим сами — детерминированно от границ района и трасс коллекторов:
// один и тот же район всегда даёт один и тот же город, адрес объекта от
// показа к показу не меняется.
//
// Сетка улиц строится в «сеточном» пространстве (прямые линии через PITCH м),
// потом изгибается плавной функцией warp — улицы получаются кривыми, как в
// живом городе. Каждая шестая линия — магистраль; квадрат 6×6 клеток между
// магистралями — тайл. У тайла свой характер (центр, спальный район, частный
// сектор, промзона, парк, лес, поля) и своя нарезка: часть внутренних улиц
// выпадает, клетки сливаются в крупные кварталы — микрорайоны, школы,
// заводы. Тайл генерируется лениво и кешируется, когда попадает в кадр.
//
// Город шире района: вокруг — пригороды, леса и поля, а карта не даёт
// отдалиться дальше края (area), чтобы граница никогда не попадала в кадр.

const PITCH = 150; // шаг сетки улиц, м
const ART = 6; // каждая ART-я линия — магистраль; тайл = ART×ART клеток
export const TILE_SIZE = PITCH * ART;

export const ROAD = {
  arterial: 26,
  local: 12,
  trace: 14,
  diagonal: 22,
  river: 120,
  rail: 9,
};

const SIDEWALK = 5;
const HOUSE_STEP = 25; // шаг нумерации домов вдоль улицы, м

// Заливка земли: плотная застройка, дворы микрорайонов, сады частного
// сектора, промзона, парк, лес, поле.
export type LandFill = 'dense' | 'block' | 'garden' | 'industrial' | 'park' | 'forest' | 'field';
export const LAND_FILLS: LandFill[] = ['field', 'forest', 'garden', 'industrial', 'block', 'dense', 'park'];

export type BuildingClass = 'home' | 'tall' | 'industrial' | 'public';
export const BUILDING_CLASSES: BuildingClass[] = ['home', 'tall', 'industrial', 'public'];

export interface StreetLabel {
  id: string;
  d: string;
  name: string;
}

export interface HouseNumber {
  x: number;
  y: number;
  text: string;
}

export interface CityTile {
  key: string;
  ground: Record<LandFill, string>;
  water: string;
  pitches: string;
  paths: string;
  trees: string;
  buildings: Record<BuildingClass, string>;
  streets: string;
  labels: StreetLabel[];
  arterialLabels: StreetLabel[];
  numbers: HouseNumber[];
}

export interface CityBase {
  ground: string;
  landuse: Record<LandFill, string>;
  arterials: string;
  diagonals: string;
  traceRoads: string;
  river: string;
  rail: string;
  lakes: string;
}

export interface CityInput {
  outline: Pt[];
  traces: Pt[][];
  landmarks: Pt[];
}

function emptyPaths<K extends string>(keys: K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  keys.forEach(key => {
    out[key] = '';
  });
  return out;
}

// ---------------------------------------------------------------- шум

function hash(n: number): number {
  let h = n | 0;
  h = (h ^ 61) ^ (h >>> 16);
  h = h + (h << 3);
  h ^= h >>> 4;
  h = Math.imul(h, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function hash2(a: number, b: number, salt: number): number {
  return hash(Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(salt, 83492791));
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

// Плавный шум 0..1 на решётке с шагом 1.
function valueNoise(x: number, y: number, salt: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash2(x0, y0, salt);
  const b = hash2(x0 + 1, y0, salt);
  const c = hash2(x0, y0 + 1, salt);
  const d = hash2(x0 + 1, y0 + 1, salt);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

// ---------------------------------------------------------------- изгиб сетки

function warp(x: number, y: number): Pt {
  return [
    x + 110 * Math.sin(y / 1400 + 1.3) + 45 * Math.sin((x + y) / 650) + 30 * Math.sin(y / 380 + x / 2900),
    y + 110 * Math.sin(x / 1600 + 0.4) + 45 * Math.sin((x - y) / 700) + 30 * Math.sin(x / 420 - y / 3100),
  ];
}

// Обратный изгиб — итерацией: смещение гладкое и не больше 185 м.
function unwarp([px, py]: Pt): Pt {
  let gx = px;
  let gy = py;
  for (let k = 0; k < 8; k++) {
    const [wx, wy] = warp(gx, gy);
    gx += px - wx;
    gy += py - wy;
  }
  return [gx, gy];
}

// Положение линии сетки: магистрали — ровно по шагу, местные улицы — с
// разбросом, чтобы кварталы были разного размера.
function lineAt(index: number, salt: number): number {
  if (index % ART === 0) {
    return index * PITCH;
  }
  return index * PITCH + (hash2(index, 0, salt) - 0.5) * 50;
}

const lineX = (i: number) => lineAt(i, 1);
const lineY = (j: number) => lineAt(j, 2);

function indexOf(value: number, at: (index: number) => number): number {
  let i = Math.floor(value / PITCH);
  while (at(i) > value) {
    i--;
  }
  while (at(i + 1) <= value) {
    i++;
  }
  return i;
}

const isArterial = (index: number) => index % ART === 0;

// ---------------------------------------------------------------- названия

const ADJECTIVES = [
  'Садовая', 'Лесная', 'Школьная', 'Полевая', 'Центральная', 'Молодёжная', 'Заводская', 'Речная',
  'Луговая', 'Парковая', 'Новая', 'Солнечная', 'Зелёная', 'Весенняя', 'Берёзовая', 'Сиреневая',
  'Рябиновая', 'Липовая', 'Кленовая', 'Тополиная', 'Вишнёвая', 'Яблоневая', 'Озёрная', 'Степная',
  'Южная', 'Северная', 'Восточная', 'Западная', 'Трудовая', 'Рабочая', 'Мостовая', 'Цветочная',
  'Звёздная', 'Светлая', 'Тихая', 'Прудовая', 'Каштановая', 'Сосновая', 'Еловая', 'Ольховая',
  'Дачная', 'Почтовая', 'Вокзальная', 'Нагорная', 'Овражная', 'Ключевая', 'Родниковая', 'Грибная',
  'Кольцевая', 'Широкая',
];

const GENITIVES = [
  'Строителей', 'Мира', 'Энергетиков', 'Металлургов', 'Космонавтов', 'Победы', 'Химиков', 'Геологов',
  'Связистов', 'Машиностроителей', 'Дружбы', 'Молодёжи', 'Ветеранов', 'Учителей', 'Авиаторов',
  'Изыскателей', 'Монтажников', 'Шахтёров', 'Нефтяников', 'Железнодорожников', 'Речников', 'Энтузиастов',
  'Садоводов', 'Мелиораторов', 'Текстильщиков', 'Лесоводов', 'Декабристов', 'Физкультурников',
  'Первопроходцев', 'Метростроевцев',
];

function arterialName(dir: 'v' | 'h', index: number): string {
  const k = Math.floor(index / ART);
  const n = (((k * 7 + (dir === 'v' ? 0 : 13)) % GENITIVES.length) + GENITIVES.length) % GENITIVES.length;
  return dir === 'v' ? `просп. ${GENITIVES[n]}` : `бульв. ${GENITIVES[n]}`;
}

function localName(dir: 'v' | 'h', index: number): string {
  // перемешиваем, чтобы соседние улицы не были «1-я», «2-я» подряд
  const raw = Math.abs(index * 2 + (dir === 'v' ? 0 : 1));
  const k = (raw * 7919) % 4001;
  const base = ADJECTIVES[k % ADJECTIVES.length];
  const ord = Math.floor(k / ADJECTIVES.length) % 7;
  return ord === 0 ? `${base} ул.` : `${ord + 1}-я ${base} ул.`;
}

export function streetName(dir: 'v' | 'h', index: number): string {
  return isArterial(index) ? arterialName(dir, index) : localName(dir, index);
}

// ---------------------------------------------------------------- геометрия

interface Segment {
  a: Pt;
  b: Pt;
}

interface Lake {
  at: Pt;
  r: number;
}

function quad(x0: number, y0: number, x1: number, y1: number): string {
  return ringPath([warp(x0, y0), warp(x1, y0), warp(x1, y1), warp(x0, y1)]);
}

// Прямоугольник сетки с промежуточными точками на сторонах — для крупных
// площадей, где изгиб сетки уже заметен.
function ring(x0: number, y0: number, x1: number, y1: number, steps: number): string {
  const points: Pt[] = [];
  for (let t = 0; t < steps; t++) {
    points.push(warp(x0 + ((x1 - x0) * t) / steps, y0));
  }
  for (let t = 0; t < steps; t++) {
    points.push(warp(x1, y0 + ((y1 - y0) * t) / steps));
  }
  for (let t = 0; t < steps; t++) {
    points.push(warp(x1 - ((x1 - x0) * t) / steps, y1));
  }
  for (let t = 0; t < steps; t++) {
    points.push(warp(x0, y1 - ((y1 - y0) * t) / steps));
  }
  return ringPath(points);
}

function circle([x, y]: Pt, r: number): string {
  return `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`;
}

// Неровное пятно воды: радиус гуляет по шуму.
function blob([x, y]: Pt, r: number, salt: number): string {
  const points: Pt[] = [];
  for (let k = 0; k < 20; k++) {
    const angle = (k / 20) * Math.PI * 2;
    const rr = r * (0.72 + 0.4 * valueNoise(Math.cos(angle) * 1.6 + 5, Math.sin(angle) * 1.6 + 5, salt));
    points.push([x + Math.cos(angle) * rr, y + Math.sin(angle) * rr * 0.8]);
  }
  return ringPath(points);
}

// ---------------------------------------------------------------- город

type TileClass = 'center' | 'residential' | 'suburb' | 'industrial' | 'park' | 'forest' | 'field';
type Land = 'none' | 'park' | 'forest' | 'field' | 'perimeter' | 'towers' | 'houses' | 'industry' | 'campus';

const TILE_FILL: Record<TileClass, LandFill> = {
  center: 'dense',
  residential: 'block',
  suburb: 'garden',
  industrial: 'industrial',
  park: 'park',
  forest: 'forest',
  field: 'field',
};

const LAND_FILL: Record<Exclude<Land, 'none'>, LandFill> = {
  perimeter: 'dense',
  towers: 'block',
  campus: 'block',
  houses: 'garden',
  industry: 'industrial',
  park: 'park',
  forest: 'forest',
  field: 'field',
};

// Нарезка тайла: какие из линий 0..6 остаются улицами.
const CUTS = [
  [0, 1, 2, 3, 4, 5, 6],
  [0, 2, 4, 6],
  [0, 1, 3, 5, 6],
  [0, 3, 6],
  [0, 1, 2, 4, 6],
  [0, 6],
];

const CUT_ODDS: Record<TileClass, [number, number][]> = {
  center: [[0.5, 0], [0.72, 2], [0.88, 1], [1, 4]],
  residential: [[0.25, 0], [0.5, 1], [0.7, 2], [0.88, 4], [1, 3]],
  suburb: [[0.6, 0], [0.85, 2], [1, 1]],
  industrial: [[0.4, 3], [0.75, 1], [1, 2]],
  park: [[1, 5]],
  forest: [[1, 5]],
  field: [[1, 5]],
};

function pick(h: number, odds: [number, number][]): number[] {
  for (const [limit, cut] of odds) {
    if (h < limit) {
      return CUTS[cut];
    }
  }
  return CUTS[0];
}

interface Layout {
  cls: TileClass;
  xs: number[];
  ys: number[];
}

interface Block {
  i: number;
  j: number;
  iEnd: number;
  jEnd: number;
  kind: Land;
}

export class City {
  readonly base: CityBase;
  // Где есть город — дальше карта не отдаляется и не сдвигается.
  readonly area: Box;

  private readonly landmarks: Pt[];
  private readonly center: Pt;
  private readonly radius: number;
  private readonly diagonals: Segment[];
  private readonly lakes: Lake[] = [];
  private readonly grid = new Map<string, Segment[]>();
  private readonly layouts = new Map<string, Layout>();
  private readonly tiles = new Map<string, CityTile | null>();
  private readonly riverMid: number;
  private readonly railMid: number;
  private readonly i0: number;
  private readonly i1: number;
  private readonly j0: number;
  private readonly j1: number;

  constructor(input: CityInput) {
    this.landmarks = input.landmarks;
    const xs = input.outline.map(p => p[0]);
    const ys = input.outline.map(p => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX;
    const h = Math.max(...ys) - minY;
    const span = Math.max(w, h);
    this.center = [minX + w / 2, minY + h / 2];
    this.radius = span / 2;
    this.riverMid = minY + h * 0.58;
    this.railMid = minY + h * 0.2;

    // район в середине, вокруг — пригороды; по ширине запас больше, окно карты широкое
    this.area = { x: this.center[0] - span * 1.1, y: this.center[1] - span * 0.8, w: span * 2.2, h: span * 1.6 };
    this.i0 = Math.floor(this.area.x / TILE_SIZE) * ART - ART;
    this.i1 = Math.ceil((this.area.x + this.area.w) / TILE_SIZE) * ART + ART;
    this.j0 = Math.floor(this.area.y / TILE_SIZE) * ART - ART;
    this.j1 = Math.ceil((this.area.y + this.area.h) / TILE_SIZE) * ART + ART;

    // две диагональные магистрали через весь город
    const along = (a: Pt, b: Pt): Segment => ({
      a: [a[0] + (a[0] - b[0]) * 0.7, a[1] + (a[1] - b[1]) * 0.7],
      b: [b[0] + (b[0] - a[0]) * 0.7, b[1] + (b[1] - a[1]) * 0.7],
    });
    this.diagonals = [
      along([minX + w * 0.04, minY + h * 0.12], [minX + w * 0.96, minY + h * 0.78]),
      along([minX + w * 0.18, minY + h * 0.97], [minX + w * 0.78, minY + h * 0.03]),
    ];

    const traceLines = input.traces.map(line => thin(line, 40));
    for (const line of traceLines) {
      for (let k = 1; k < line.length; k++) {
        this.index({ a: line[k - 1], b: line[k] });
      }
    }

    this.base = this.buildBase(traceLines);
  }

  // ------------------------------------------------ препятствия для домов

  private index(segment: Segment) {
    const cell = 250;
    const pad = 40;
    const cx0 = Math.floor((Math.min(segment.a[0], segment.b[0]) - pad) / cell);
    const cx1 = Math.floor((Math.max(segment.a[0], segment.b[0]) + pad) / cell);
    const cy0 = Math.floor((Math.min(segment.a[1], segment.b[1]) - pad) / cell);
    const cy1 = Math.floor((Math.max(segment.a[1], segment.b[1]) + pad) / cell);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const key = `${cx},${cy}`;
        const list = this.grid.get(key);
        if (list) {
          list.push(segment);
        } else {
          this.grid.set(key, [segment]);
        }
      }
    }
  }

  private riverY(x: number): number {
    return this.riverMid + 1700 * Math.sin(x / 3300 + 0.6) + 500 * Math.sin(x / 1200 + 2.1);
  }

  private riverDistance([x, y]: Pt): number {
    const slope = (1700 / 3300) * Math.cos(x / 3300 + 0.6) + (500 / 1200) * Math.cos(x / 1200 + 2.1);
    return Math.abs(y - this.riverY(x)) / Math.sqrt(1 + slope * slope);
  }

  private railY(x: number): number {
    return this.railMid + 900 * Math.sin(x / 4100 + 1.1) + 260 * Math.sin(x / 1500 + 0.3);
  }

  private railDistance([x, y]: Pt): number {
    const slope = (900 / 4100) * Math.cos(x / 4100 + 1.1) + (260 / 1500) * Math.cos(x / 1500 + 0.3);
    return Math.abs(y - this.railY(x)) / Math.sqrt(1 + slope * slope);
  }

  private blocked(p: Pt, pad: number): boolean {
    if (this.riverDistance(p) < ROAD.river / 2 + pad + 6) {
      return true;
    }
    if (this.railDistance(p) < ROAD.rail / 2 + pad + 6) {
      return true;
    }
    for (const segment of this.diagonals) {
      if (nearestOnSegment(p, segment.a, segment.b).d2 < (ROAD.diagonal / 2 + pad) ** 2) {
        return true;
      }
    }
    const near = this.grid.get(`${Math.floor(p[0] / 250)},${Math.floor(p[1] / 250)}`);
    if (near) {
      for (const segment of near) {
        if (nearestOnSegment(p, segment.a, segment.b).d2 < (ROAD.trace / 2 + pad) ** 2) {
          return true;
        }
      }
    }
    for (const landmark of this.landmarks) {
      if ((p[0] - landmark[0]) ** 2 + (p[1] - landmark[1]) ** 2 < (38 + pad) ** 2) {
        return true;
      }
    }
    for (const lake of this.lakes) {
      if ((p[0] - lake.at[0]) ** 2 + (p[1] - lake.at[1]) ** 2 < (lake.r * 1.15 + pad) ** 2) {
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------ характер района

  private tileClass(ti: number, tj: number): TileClass {
    const at = warp((ti + 0.5) * TILE_SIZE, (tj + 0.5) * TILE_SIZE);
    const d = Math.hypot(at[0] - this.center[0], at[1] - this.center[1]) / this.radius;
    const falloff = 1 - smooth(Math.min(1, Math.max(0, (d - 0.75) / 0.95)));
    const urban = 0.4 * valueNoise(at[0] / 5200, at[1] / 5200, 5) + 0.6 * falloff;
    const h = hash2(ti, tj, 7);
    if (urban > 0.3 && hash2(ti, tj, 11) < 0.08 && this.riverDistance(at) > 500) {
      return 'park';
    }
    if (urban > 0.72) {
      return 'center';
    }
    if (urban > 0.5) {
      return h < 0.2 ? 'industrial' : 'residential';
    }
    if (urban > 0.36) {
      return h < 0.12 ? 'industrial' : 'suburb';
    }
    // леса и поля — крупными массивами по шуму, а не вперемешку по тайлам
    const wood = valueNoise(at[0] / 2600, at[1] / 2600, 13);
    if (urban > 0.24) {
      return wood < 0.42 ? 'forest' : 'suburb';
    }
    return wood < 0.5 ? 'forest' : 'field';
  }

  private layout(ti: number, tj: number): Layout {
    const key = `${ti}:${tj}`;
    let layout = this.layouts.get(key);
    if (!layout) {
      const cls = this.tileClass(ti, tj);
      if (cls === 'forest' || cls === 'field') {
        // за городом — одна просёлочная улица через тайл
        const road = hash2(ti, tj, 32) < 0.5;
        layout = { cls, xs: road ? CUTS[3] : CUTS[5], ys: road ? CUTS[5] : CUTS[3] };
      } else {
        layout = { cls, xs: pick(hash2(ti, tj, 32), CUT_ODDS[cls]), ys: pick(hash2(ti, tj, 33), CUT_ODDS[cls]) };
      }
      this.layouts.set(key, layout);
    }
    return layout;
  }

  private rural(ti: number, tj: number): boolean {
    const cls = this.tileClass(ti, tj);
    return cls === 'forest' || cls === 'field';
  }

  // Магистраль по левому ('v') или верхнему ('h') краю тайла. В городе —
  // сквозные проспекты на части линий и отдельные перегоны на остальных
  // (там край тайла — обычная улица), за городом — только редкие дороги.
  private arterial(dir: 'v' | 'h', ti: number, tj: number): boolean {
    const [ta, tb] = dir === 'v' ? [ti - 1, tj] : [ti, tj - 1];
    const salt = dir === 'v' ? 0 : 1;
    const segment = hash2(ti * 3 + salt, tj, 51);
    if (this.rural(ta, tb) && this.rural(ti, tj)) {
      return segment < 0.22;
    }
    const line = dir === 'v' ? ti : tj;
    return hash2(line, salt, 61) < 0.5 || segment < 0.3;
  }

  private blockKind(cls: TileClass, i: number, j: number, cells: number, center: Pt): Land {
    const river = this.riverDistance(center);
    if (river < ROAD.river / 2 + 40) {
      return 'none';
    }
    if (river < ROAD.river / 2 + 170) {
      return cls === 'forest' || cls === 'field' ? 'forest' : 'park';
    }
    const h = hash2(i, j, 3);
    const big = cells >= 4;
    switch (cls) {
      case 'park':
        return 'park';
      case 'forest':
        return h < 0.9 ? 'forest' : h < 0.96 ? 'field' : 'houses';
      case 'field':
        return h < 0.8 ? 'field' : h < 0.92 ? 'forest' : 'houses';
      case 'suburb':
        if (h < 0.07) {
          return 'park';
        }
        if (h < 0.14) {
          return 'forest';
        }
        if (big && h < 0.3) {
          return 'campus';
        }
        return h < 0.22 ? 'towers' : 'houses';
      case 'industrial':
        if (h < 0.08) {
          return 'park';
        }
        return h < 0.2 ? 'towers' : 'industry';
      case 'center':
        if (h < 0.07) {
          return 'park';
        }
        if (h < 0.13) {
          return 'campus';
        }
        if (big) {
          return h < 0.35 ? 'campus' : 'towers';
        }
        return 'perimeter';
      default:
        if (h < 0.06) {
          return 'park';
        }
        if (h < 0.12) {
          return 'campus';
        }
        if (!big && h < 0.22) {
          return 'perimeter';
        }
        if (!big && h < 0.28) {
          return 'houses';
        }
        return 'towers';
    }
  }

  // ------------------------------------------------ основа: видна на любом масштабе

  private buildBase(traceLines: Pt[][]): CityBase {
    const { x, y, w, h } = this.area;
    const ground = ringPath([
      [x - 2000, y - 2000],
      [x + w + 2000, y - 2000],
      [x + w + 2000, y + h + 2000],
      [x - 2000, y + h + 2000],
    ]);

    // характер районов — заливка кварталов; просветы между ними дают рисунок
    // улиц даже там, где самих улиц на обзоре не видно
    const landuse = emptyPaths(LAND_FILLS);
    let lakes = '';
    const gap = (index: number) => (isArterial(index) ? ROAD.arterial : ROAD.local) / 2 + 4;
    for (let ti = this.i0 / ART; ti < this.i1 / ART; ti++) {
      for (let tj = this.j0 / ART; tj < this.j1 / ART; tj++) {
        const cls = this.tileClass(ti, tj);
        const rural = this.rural(ti, tj);
        if (rural) {
          // за городом — сплошной массив внахлёст с соседями, поверх только
          // вкрапления другого вида (поляны, хутора)
          landuse[TILE_FILL[cls]] += ring(
            lineX(ti * ART) - 2,
            lineY(tj * ART) - 2,
            lineX((ti + 1) * ART) + 2,
            lineY((tj + 1) * ART) + 2,
            3
          );
        }
        for (const { i, j, iEnd, jEnd, kind } of this.blocks(ti, tj).blocks) {
          const fill = kind === 'none' ? TILE_FILL[cls] : LAND_FILL[kind];
          if (rural && fill === TILE_FILL[cls]) {
            continue;
          }
          const steps = Math.max(1, Math.round(Math.max(iEnd - i, jEnd - j) / 2));
          landuse[fill] += ring(
            lineX(i) + gap(i),
            lineY(j) + gap(j),
            lineX(iEnd) - gap(iEnd),
            lineY(jEnd) - gap(jEnd),
            steps
          );
        }
        // озёра — в больших парках и кое-где в лесу
        const lh = hash2(ti, tj, 41);
        if ((cls === 'park' && lh < 0.7) || (cls === 'forest' && lh < 0.12)) {
          const at = warp(
            (ti + 0.3 + hash2(ti, tj, 42) * 0.4) * TILE_SIZE,
            (tj + 0.3 + hash2(ti, tj, 43) * 0.4) * TILE_SIZE
          );
          const r = 120 + hash2(ti, tj, 44) * 150;
          if (this.riverDistance(at) > r + 250 && !this.blocked(at, r)) {
            this.lakes.push({ at, r });
            lakes += blob(at, r, ti * 31 + tj);
          }
        }
      }
    }

    // магистрали — между тайлами; в лесах и полях остаются только редкие
    // дороги. Точки через клетку: изгиб на 300 м почти прямой.
    let arterials = '';
    const runs = (open: (t: number) => boolean, from: number, to: number, at: (index: number) => Pt) => {
      let points: Pt[] = [];
      for (let t = from; t < to; t++) {
        if (open(t)) {
          for (let k = points.length === 0 ? 0 : 2; k <= ART; k += 2) {
            points.push(at(t * ART + k));
          }
        } else if (points.length > 0) {
          arterials += linePath(points);
          points = [];
        }
      }
      if (points.length > 1) {
        arterials += linePath(points);
      }
    };
    for (let ti = this.i0 / ART; ti <= this.i1 / ART; ti++) {
      const i = ti * ART;
      runs(tj => this.arterial('v', ti, tj), this.j0 / ART, this.j1 / ART, j => warp(lineX(i), lineY(j)));
    }
    for (let tj = this.j0 / ART; tj <= this.j1 / ART; tj++) {
      const j = tj * ART;
      runs(ti => this.arterial('h', ti, tj), this.i0 / ART, this.i1 / ART, i => warp(lineX(i), lineY(j)));
    }

    const diagonals = this.diagonals.map(segment => linePath([segment.a, segment.b])).join('');
    const traceRoads = traceLines.map(linePath).join('');

    const river: Pt[] = [];
    const rail: Pt[] = [];
    for (let px = x - 2000; px <= x + w + 2000; px += 80) {
      river.push([px, this.riverY(px)]);
      rail.push([px, this.railY(px)]);
    }

    return {
      ground,
      landuse,
      arterials,
      diagonals,
      traceRoads,
      river: linePath(river),
      rail: linePath(rail),
      lakes,
    };
  }

  // ------------------------------------------------ тайлы

  tilesIn(box: Box): [number, number][] {
    // запас на изгиб сетки (до 185 м) и на дома у края кадра
    const margin = 250;
    const [gx0, gy0] = [box.x - margin, box.y - margin];
    const [gx1, gy1] = [box.x + box.w + margin, box.y + box.h + margin];
    const ti0 = Math.max(Math.floor(gx0 / TILE_SIZE), this.i0 / ART);
    const ti1 = Math.min(Math.floor(gx1 / TILE_SIZE), this.i1 / ART - 1);
    const tj0 = Math.max(Math.floor(gy0 / TILE_SIZE), this.j0 / ART);
    const tj1 = Math.min(Math.floor(gy1 / TILE_SIZE), this.j1 / ART - 1);
    const out: [number, number][] = [];
    for (let ti = ti0; ti <= ti1; ti++) {
      for (let tj = tj0; tj <= tj1; tj++) {
        out.push([ti, tj]);
      }
    }
    return out;
  }

  tile(ti: number, tj: number): CityTile | null {
    const key = `${ti}:${tj}`;
    if (!this.tiles.has(key)) {
      this.tiles.set(key, this.buildTile(ti, tj, key));
    }
    return this.tiles.get(key) ?? null;
  }

  // Кварталы тайла: между соседними оставшимися линиями.
  private blocks(ti: number, tj: number): { blocks: Block[]; cellBlock: Block[][] } {
    const { cls, xs, ys } = this.layout(ti, tj);
    const I = ti * ART;
    const J = tj * ART;
    const blocks: Block[] = [];
    const cellBlock: Block[][] = [];
    for (let a = 0; a < ART; a++) {
      cellBlock.push([]);
    }
    for (let p = 0; p + 1 < xs.length; p++) {
      for (let q = 0; q + 1 < ys.length; q++) {
        const i = I + xs[p];
        const iEnd = I + xs[p + 1];
        const j = J + ys[q];
        const jEnd = J + ys[q + 1];
        const center = warp((lineX(i) + lineX(iEnd)) / 2, (lineY(j) + lineY(jEnd)) / 2);
        const block: Block = { i, j, iEnd, jEnd, kind: this.blockKind(cls, i, j, (iEnd - i) * (jEnd - j), center) };
        blocks.push(block);
        for (let a = xs[p]; a < xs[p + 1]; a++) {
          for (let b = ys[q]; b < ys[q + 1]; b++) {
            cellBlock[a][b] = block;
          }
        }
      }
    }

    return { blocks, cellBlock };
  }

  private buildTile(ti: number, tj: number, key: string): CityTile | null {
    const { cls, xs, ys } = this.layout(ti, tj);
    const I = ti * ART;
    const J = tj * ART;

    const { blocks, cellBlock } = this.blocks(ti, tj);

    const ground = emptyPaths(LAND_FILLS);
    const buildings = emptyPaths(BUILDING_CLASSES);
    let water = '';
    let pitches = '';
    let paths = '';
    let trees = '';
    const numbers: HouseNumber[] = [];
    const used = new Map<string, number>();

    const address = (dir: 'v' | 'h', index: number, t: number, side: 0 | 1): string => {
      const origin = dir === 'v' ? lineY(this.j0) : lineX(this.i0);
      const n = Math.max(0, Math.floor((t - origin) / HOUSE_STEP)) * 2 + 1 + side;
      const id = `${dir}${index}:${n}`;
      const count = (used.get(id) ?? 0) + 1;
      used.set(id, count);
      return count === 1 ? `${n}` : `${n}к${count}`;
    };

    const house = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      label: string | null,
      style: BuildingClass = 'home'
    ): boolean => {
      const mid = warp((x0 + x1) / 2, (y0 + y1) / 2);
      const probes: Pt[] = [mid];
      if (Math.max(x1 - x0, y1 - y0) > 30) {
        probes.push(warp(x0 + 3, y0 + 3), warp(x1 - 3, y0 + 3), warp(x1 - 3, y1 - 3), warp(x0 + 3, y1 - 3));
      }
      if (probes.some(p => this.blocked(p, 8))) {
        return false;
      }
      buildings[style] += quad(x0, y0, x1, y1);
      if (label) {
        numbers.push({ x: mid[0], y: mid[1], text: label });
      }
      return true;
    };

    const tree = (x: number, y: number, r: number) => {
      const p = warp(x, y);
      if (!this.blocked(p, 1)) {
        trees += circle(p, r);
      }
    };

    for (const block of blocks) {
      const { i, j, iEnd, jEnd, kind } = block;
      if (kind === 'none') {
        continue;
      }
      const insetL = (isArterial(i) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
      const insetR = (isArterial(iEnd) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
      const insetT = (isArterial(j) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
      const insetB = (isArterial(jEnd) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
      const x0 = lineX(i) + insetL;
      const x1 = lineX(iEnd) - insetR;
      const y0 = lineY(j) + insetT;
      const y1 = lineY(jEnd) - insetB;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw < 30 || bh < 30) {
        continue;
      }
      const seed = hash2(i, j, 9);
      const rnd = (k: number, salt: number) => hash2(i * 131 + k, j * 71 + salt, salt);

      const gx0 = x0 - SIDEWALK + 2;
      const gx1 = x1 + SIDEWALK - 2;
      const gy0 = y0 - SIDEWALK + 2;
      const gy1 = y1 + SIDEWALK - 2;
      ground[LAND_FILL[kind]] += bw * bh > 60000 ? ring(gx0, gy0, gx1, gy1, 3) : quad(gx0, gy0, gx1, gy1);

      // ближайшая улица к точке квартала — для адреса дома
      const edgeAddress = (cx: number, cy: number): string => {
        const options: [number, 'v' | 'h', number, number, 0 | 1][] = [
          [cx - x0, 'v', i, cy, 1],
          [x1 - cx, 'v', iEnd, cy, 0],
          [cy - y0, 'h', j, cx, 1],
          [y1 - cy, 'h', jEnd, cx, 0],
        ];
        options.sort((p, q) => p[0] - q[0]);
        const [, dir, index, t, side] = options[0];
        return address(dir, index, t, side);
      };

      if (kind === 'park') {
        // пруд в крупном сквере
        const ponds: Lake[] = [];
        if (bw > 110 && bh > 110 && seed < 0.55) {
          const r = Math.min(bw, bh) * (0.14 + rnd(0, 25) * 0.1);
          const at = warp(x0 + bw * (0.3 + rnd(1, 26) * 0.4), y0 + bh * (0.3 + rnd(2, 27) * 0.4));
          if (!this.blocked(at, r)) {
            ponds.push({ at, r });
            water += blob(at, r, i * 7 + j);
          }
        }
        // дорожки: крест-накрест или кольцо с входом
        if (bw > 70 && bh > 70) {
          const lines: Pt[][] =
            seed < 0.5
              ? [
                  [warp(x0, y0), warp((x0 + x1) / 2, (y0 + y1) / 2 + bh * 0.08), warp(x1, y1)],
                  [warp(x1, y0), warp((x0 + x1) / 2 + bw * 0.06, (y0 + y1) / 2), warp(x0, y1)],
                ]
              : [
                  [
                    warp(x0 + bw * 0.2, y0 + bh * 0.2),
                    warp(x1 - bw * 0.2, y0 + bh * 0.25),
                    warp(x1 - bw * 0.2, y1 - bh * 0.2),
                    warp(x0 + bw * 0.25, y1 - bh * 0.2),
                    warp(x0 + bw * 0.2, y0 + bh * 0.2),
                  ],
                  [warp((x0 + x1) / 2, y0), warp((x0 + x1) / 2, y0 + bh * 0.22)],
                ];
          for (const line of lines) {
            paths += linePath(line);
          }
        }
        if (seed > 0.8 && bw > 90) {
          pitches += quad(x1 - 58, y1 - 38, x1 - 8, y1 - 8);
        }
        // рощи и поляны: деревья там, где шум выше
        const count = Math.floor((bw * bh) / 420);
        for (let k = 0; k < count; k++) {
          const px = x0 + rnd(k, 21) * bw;
          const py = y0 + rnd(k, 22) * bh;
          if (valueNoise(px / 70, py / 70, 24) < 0.45) {
            continue;
          }
          const p = warp(px, py);
          if (ponds.some(pond => Math.hypot(p[0] - pond.at[0], p[1] - pond.at[1]) < pond.r * 1.2 + 4)) {
            continue;
          }
          tree(px, py, 3.5 + rnd(k, 23) * 3.5);
        }
        continue;
      }

      if (kind === 'forest') {
        const count = Math.floor((bw * bh) / 900);
        for (let k = 0; k < count; k++) {
          tree(x0 + rnd(k, 28) * bw, y0 + rnd(k, 29) * bh, 5 + rnd(k, 30) * 4);
        }
        continue;
      }

      if (kind === 'field') {
        // лесополоса вдоль одной стороны и хутор
        if (seed < 0.6) {
          for (let t = x0 + 6; t < x1 - 6; t += 11) {
            tree(t, seed < 0.3 ? y0 + 5 : y1 - 5, 4 + rnd(Math.round(t), 31) * 2);
          }
        }
        if (seed > 0.7) {
          const fx = x0 + bw * rnd(0, 32) * 0.7;
          const fy = y0 + bh * rnd(1, 33) * 0.7;
          house(fx, fy, fx + 14, fy + 10, edgeAddress(fx, fy));
          house(fx + 20, fy + 4, fx + 44, fy + 16, null, 'industrial');
        }
        continue;
      }

      if (kind === 'perimeter') {
        const depth = 13 + seed * 5;
        const edge = (
          along: 'x' | 'y',
          from: number,
          to: number,
          fixed0: number,
          fixed1: number,
          dir: 'v' | 'h',
          index: number,
          side: 0 | 1
        ) => {
          let t = from;
          let k = 0;
          while (t < to - 12) {
            const len = Math.min(to - t, 22 + hash2(i * 31 + k, j * 17 + index, 12) * 38);
            const gap = hash2(k, i * 13 + j, 13) < 0.3 ? 6 + hash2(k, j, 14) * 10 : 1.5;
            const label = address(dir, index, t + len / 2, side);
            const style: BuildingClass = hash2(k, i + index, 19) < 0.18 ? 'tall' : 'home';
            if (along === 'x') {
              house(t, fixed0, t + len, fixed1, label, style);
            } else {
              house(fixed0, t, fixed1, t + len, label, style);
            }
            t += len + gap;
            k++;
          }
        };
        edge('x', x0, x1, y0, y0 + depth, 'h', j, 1);
        edge('x', x0, x1, y1 - depth, y1, 'h', jEnd, 0);
        edge('y', y0 + depth + 2, y1 - depth - 2, x0, x0 + depth, 'v', i, 1);
        edge('y', y0 + depth + 2, y1 - depth - 2, x1 - depth, x1, 'v', iEnd, 0);
        // зелёный двор с деревьями, иногда спортплощадка
        const cx0 = x0 + depth + 6;
        const cx1 = x1 - depth - 6;
        const cy0 = y0 + depth + 6;
        const cy1 = y1 - depth - 6;
        if (cx1 - cx0 > 24 && cy1 - cy0 > 24) {
          ground.garden += quad(cx0, cy0, cx1, cy1);
          const count = 3 + Math.floor(rnd(0, 34) * 5);
          for (let k = 0; k < count; k++) {
            tree(cx0 + 4 + rnd(k, 35) * (cx1 - cx0 - 8), cy0 + 4 + rnd(k, 36) * (cy1 - cy0 - 8), 3 + rnd(k, 37) * 2.5);
          }
          if (seed > 0.6 && cx1 - cx0 > 50 && cy1 - cy0 > 40) {
            pitches += quad(cx0 + 6, cy0 + 6, cx0 + 30, cy0 + 22);
          }
        }
        continue;
      }

      if (kind === 'campus') {
        // школа буквой П, стадион и деревья по ограде
        const len = Math.min(bw * 0.62, 96);
        const sx = x0 + 8 + (bw - len - 16) * rnd(0, 38);
        const sy = y0 + 8;
        if (house(sx, sy, sx + len, sy + 16, edgeAddress(sx + len / 2, sy), 'public')) {
          house(sx, sy + 17, sx + 14, sy + 44, null, 'public');
          house(sx + len - 14, sy + 17, sx + len, sy + 44, null, 'public');
        }
        const pw = Math.min(bw * 0.55, 72);
        const ph = Math.min(bh * 0.38, 44);
        const px = x1 - pw - 8 - (bw - pw - 16) * rnd(1, 39) * 0.5;
        const py = y1 - ph - 8;
        if (py > sy + 50 && !this.blocked(warp(px + pw / 2, py + ph / 2), 10)) {
          pitches += quad(px, py, px + pw, py + ph);
        }
        for (let t = x0 + 4; t < x1 - 4; t += 12) {
          tree(t, y1 - 3, 3.2);
        }
        for (let t = y0 + 60; t < y1 - 4; t += 12) {
          tree(x0 + 3, t, 3.2);
        }
        continue;
      }

      if (kind === 'industry') {
        // участки по 90–140 м: цех, склад, иногда резервуары
        const nx = Math.max(1, Math.round(bw / 115));
        const ny = Math.max(1, Math.round(bh / 115));
        const pw = bw / nx;
        const ph = bh / ny;
        for (let a = 0; a < nx; a++) {
          for (let b = 0; b < ny; b++) {
            const k = a * 7 + b;
            const px0 = x0 + a * pw + 6;
            const py0 = y0 + b * ph + 6;
            const w = (pw - 12) * (0.45 + rnd(k, 40) * 0.4);
            const h = (ph - 12) * (0.35 + rnd(k, 41) * 0.4);
            const ox = px0 + (pw - 12 - w) * rnd(k, 42);
            const oy = py0 + (ph - 12 - h) * rnd(k, 43);
            house(ox, oy, ox + w, oy + h, edgeAddress(ox + w / 2, oy + h / 2), 'industrial');
            const r = rnd(k, 44);
            if (r < 0.3) {
              const tx = ox + w + 14 < px0 + pw - 12 ? ox + w + 12 : ox + 10;
              const ty = oy + h + 14 < py0 + ph - 12 ? oy + h + 12 : oy - 12;
              for (let t = 0; t < 3; t++) {
                const p = warp(tx, ty + t * 19);
                if (!this.blocked(p, 10)) {
                  buildings.industrial += circle(p, 7.5);
                }
              }
            } else if (r < 0.65) {
              const ax = ox + w + 6;
              if (ax + 14 < px0 + pw - 6) {
                house(ax, oy, ax + 14, oy + Math.min(h, 24), null, 'industrial');
              }
            }
          }
        }
        continue;
      }

      if (kind === 'houses') {
        // частный сектор: дома 9–12 м в два ряда вдоль длинных сторон, за ними сады
        const lot = 20 + seed * 6;
        const alongX = bw >= bh;
        const length = alongX ? bw : bh;
        const from = alongX ? x0 : y0;
        const rows: [number, 'v' | 'h', number, 0 | 1, number][] = alongX
          ? [
              [y0 + 4, 'h', j, 1, 1],
              [y1 - 16, 'h', jEnd, 0, -1],
            ]
          : [
              [x0 + 4, 'v', i, 1, 1],
              [x1 - 16, 'v', iEnd, 0, -1],
            ];
        for (const [r, dir, index, side, inward] of rows) {
          for (let t = from; t + lot <= from + length + 1; t += lot) {
            const hsh = hash2(Math.round(t), Math.round(r), 18);
            if (hsh < 0.1) {
              continue;
            }
            const size = 9 + hsh * 3;
            const b0 = t + (lot - size) / 2;
            const label = address(dir, index, t + lot / 2, side);
            if (alongX) {
              house(b0, r, b0 + size, r + size, label);
              if (hsh > 0.4) {
                tree(b0 + size / 2, r + size / 2 + inward * 18, 3.5 + hsh * 2);
              }
            } else {
              house(r, b0, r + size, b0 + size, label);
              if (hsh > 0.4) {
                tree(r + size / 2 + inward * 18, b0 + size / 2, 3.5 + hsh * 2);
              }
            }
          }
        }
        continue;
      }

      // микрорайон: пластины, башни, угловые дома; деревья между ними,
      // в крупном — детский сад
      const nx = Math.max(1, Math.round(bw / 72));
      const ny = Math.max(1, Math.round(bh / 72));
      const cw = bw / nx;
      const ch = bh / ny;
      const kindergarten = nx * ny >= 6 ? Math.floor(rnd(0, 45) * nx * ny) : -1;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < ny; b++) {
          const k = a * ny + b;
          const cx0 = x0 + a * cw;
          const cy0 = y0 + b * ch;
          const hsh = rnd(k, 15);
          if (k === kindergarten) {
            const s = Math.min(cw, ch) * 0.5;
            const kx = cx0 + (cw - s) / 2;
            const ky = cy0 + (ch - s) / 2;
            house(kx, ky, kx + s, ky + s, edgeAddress(kx + s / 2, ky + s / 2), 'public');
            continue;
          }
          if (hsh < 0.1) {
            continue;
          }
          if (hsh < 0.34) {
            // точечная башня
            const s = 16 + rnd(k, 16) * 5;
            const bx = cx0 + (cw - s) * (0.2 + rnd(k, 17) * 0.6);
            const by = cy0 + (ch - s) * (0.2 + rnd(k, 18) * 0.6);
            house(bx, by, bx + s, by + s, edgeAddress(bx + s / 2, by + s / 2), 'tall');
            continue;
          }
          const horizontal = rnd(k, 19) > 0.5;
          const len = Math.min((horizontal ? cw : ch) - 10, 38 + hsh * 40);
          const bx = cx0 + (cw - (horizontal ? len : 13)) * rnd(k, 16);
          const by = cy0 + (ch - (horizontal ? 13 : len)) * rnd(k, 17);
          const w = horizontal ? len : 13;
          const h = horizontal ? 13 : len;
          const style: BuildingClass = len > 62 ? 'tall' : 'home';
          if (house(bx, by, bx + w, by + h, edgeAddress(bx + w / 2, by + h / 2), style) && hsh > 0.78) {
            // угловой дом: крыло под прямым углом
            if (horizontal) {
              const wy = by + 35 <= cy0 + ch - 4 ? by + 13 : by - 22;
              house(bx, wy, bx + 13, wy + 22, null, style);
            } else {
              const wx = bx + 35 <= cx0 + cw - 4 ? bx + 13 : bx - 22;
              house(wx, by, wx + 22, by + 13, null, style);
            }
          }
        }
      }
      for (let a = 1; a < nx; a++) {
        for (let b = 1; b < ny; b++) {
          const k = a * 11 + b;
          tree(x0 + a * cw + (rnd(k, 46) - 0.5) * 6, y0 + b * ch + (rnd(k, 47) - 0.5) * 6, 3.5 + rnd(k, 48) * 2);
        }
      }
    }

    // деревья вдоль магистралей по краю тайла (своя сторона каждой)
    if (cls !== 'forest' && cls !== 'field' && cls !== 'park') {
      const off = ROAD.arterial / 2 + 2.5;
      const near = (value: number, cuts: number[]) => cuts.some(cut => Math.abs(value - cut) < 16);
      const cutsY = ys.map(b => lineY(J + b));
      const cutsX = xs.map(a => lineX(I + a));
      for (let t = lineY(J) + 18; t < lineY(J + ART) - 18; t += 13) {
        if (!near(t, cutsY)) {
          tree(lineX(I) + off, t, 3);
          tree(lineX(I + ART) - off, t, 3);
        }
      }
      for (let t = lineX(I) + 18; t < lineX(I + ART) - 18; t += 13) {
        if (!near(t, cutsX)) {
          tree(t, lineY(J) + off, 3);
          tree(t, lineY(J + ART) - off, 3);
        }
      }
    }

    let streets = '';
    const labels: StreetLabel[] = [];
    const arterialLabels: StreetLabel[] = [];
    const kindAt = (a: number, b: number): Land => cellBlock[a]?.[b]?.kind ?? 'none';
    // Улица в пределах тайла: участки между перекрёстками, у которых хотя бы
    // с одной стороны есть квартал. Возвращает самый длинный сплошной участок —
    // по нему идёт подпись.
    const street = (open: (k: number) => boolean, at: (t: number) => Pt): Pt[] => {
      let best: Pt[] = [];
      let current: Pt[] = [];
      const flush = () => {
        if (current.length > 1) {
          streets += linePath(current);
          if (current.length > best.length) {
            best = current;
          }
        }
        current = [];
      };
      for (let k = 0; k < ART; k++) {
        if (open(k)) {
          if (current.length === 0) {
            current.push(at(k));
          }
          current.push(at(k + 0.5), at(k + 1));
        } else {
          flush();
        }
      }
      flush();
      return best;
    };

    const addLabel = (into: StreetLabel[], id: string, points: Pt[], name: string) => {
      if (points.length < 3) {
        return;
      }
      // подпись читается слева направо (или сверху вниз)
      const first = points[0];
      const last = points[points.length - 1];
      const ordered = last[0] < first[0] - 1 ? [...points].reverse() : points;
      into.push({ id, d: linePath(ordered), name });
    };

    for (const a of xs) {
      const i = I + a;
      if (a === ART) {
        continue;
      }
      if (a === 0) {
        const points: Pt[] = [];
        for (let b = 0; b <= ART; b++) {
          points.push(warp(lineX(i), lineY(J + b)));
        }
        if (this.arterial('v', ti, tj)) {
          addLabel(arterialLabels, `v${i}-${key}`, points, streetName('v', i));
        } else if (!(this.rural(ti - 1, tj) && this.rural(ti, tj))) {
          streets += linePath(points);
          addLabel(labels, `v${i}-${key}`, points, streetName('v', i));
        }
        continue;
      }
      const line = street(
        b => kindAt(a - 1, b) !== 'none' || kindAt(a, b) !== 'none',
        t => {
          const j = J + Math.floor(t);
          const f = t - Math.floor(t);
          return warp(lineX(i), lineY(j) + (lineY(j + 1) - lineY(j)) * f);
        }
      );
      addLabel(labels, `v${i}-${key}`, line, streetName('v', i));
    }
    for (const b of ys) {
      const j = J + b;
      if (b === ART) {
        continue;
      }
      if (b === 0) {
        const points: Pt[] = [];
        for (let a = 0; a <= ART; a++) {
          points.push(warp(lineX(I + a), lineY(j)));
        }
        if (this.arterial('h', ti, tj)) {
          addLabel(arterialLabels, `h${j}-${key}`, points, streetName('h', j));
        } else if (!(this.rural(ti, tj - 1) && this.rural(ti, tj))) {
          streets += linePath(points);
          addLabel(labels, `h${j}-${key}`, points, streetName('h', j));
        }
        continue;
      }
      const line = street(
        a => kindAt(a, b - 1) !== 'none' || kindAt(a, b) !== 'none',
        t => {
          const i = I + Math.floor(t);
          const f = t - Math.floor(t);
          return warp(lineX(i) + (lineX(i + 1) - lineX(i)) * f, lineY(j));
        }
      );
      addLabel(labels, `h${j}-${key}`, line, streetName('h', j));
    }

    return { key, ground, water, pitches, paths, trees, buildings, streets, labels, arterialLabels, numbers };
  }

  // ------------------------------------------------ адрес точки

  // Адрес ближайшего дома: улица, на которую выходит квартал, и номер по
  // положению вдоль неё — та же нумерация, что подписана на домах.
  addressAt(p: Pt): string {
    const [gx, gy] = unwarp(p);
    const ci = indexOf(gx, lineX);
    const cj = indexOf(gy, lineY);
    const ti = Math.floor(ci / ART);
    const tj = Math.floor(cj / ART);
    const { xs, ys } = this.layout(ti, tj);
    const a = ci - ti * ART;
    const b = cj - tj * ART;
    const i = ti * ART + Math.max(...xs.filter(x => x <= a));
    const iEnd = ti * ART + Math.min(...xs.filter(x => x > a));
    const j = tj * ART + Math.max(...ys.filter(y => y <= b));
    const jEnd = tj * ART + Math.min(...ys.filter(y => y > b));
    const options: [number, 'v' | 'h', number, number, 0 | 1][] = [
      [gx - lineX(i), 'v', i, gy, 1],
      [lineX(iEnd) - gx, 'v', iEnd, gy, 0],
      [gy - lineY(j), 'h', j, gx, 1],
      [lineY(jEnd) - gy, 'h', jEnd, gx, 0],
    ];
    options.sort((o1, o2) => o1[0] - o2[0]);
    const [, dir, index, t, side] = options[0];
    const origin = dir === 'v' ? lineY(this.j0) : lineX(this.i0);
    const n = Math.max(0, Math.floor((t - origin) / HOUSE_STEP)) * 2 + 1 + side;
    return `${streetName(dir, index)}, ${n}`;
  }
}
