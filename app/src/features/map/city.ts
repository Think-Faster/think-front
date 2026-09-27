import { Box, linePath, nearestOnSegment, Pt, ringPath, thin } from './geo';

// Город под картой района. Настоящей подложки у схемы нет (координаты —
// условные метры), поэтому кварталы, дома, улицы, парки и реку строим сами —
// детерминированно от границ района и трасс коллекторов: один и тот же район
// всегда даёт один и тот же город, адрес объекта от показа к показу не меняется.
//
// Сетка улиц строится в «сеточном» пространстве (прямые линии через PITCH м),
// потом изгибается плавной функцией warp — улицы получаются кривыми, как в
// живом городе. Каждая шестая линия — магистраль; квадрат 6×6 кварталов —
// тайл, который генерируется лениво и кешируется, когда попадает в кадр.

const PITCH = 150; // шаг сетки улиц, м
const ART = 6; // каждая ART-я линия — магистраль; тайл = ART×ART кварталов
export const TILE_SIZE = PITCH * ART;

export const ROAD = {
  arterial: 26,
  local: 12,
  trace: 14,
  diagonal: 22,
  river: 120,
};

const SIDEWALK = 5;
const HOUSE_STEP = 25; // шаг нумерации домов вдоль улицы, м

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
  parks: string;
  buildings: string;
  trees: string;
  streets: string;
  labels: StreetLabel[];
  arterialLabels: StreetLabel[];
  numbers: HouseNumber[];
}

export interface CityBase {
  outline: string;
  arterials: string;
  diagonals: string;
  traceRoads: string;
  river: string;
  parks: string;
}

export interface CityInput {
  outline: Pt[];
  traces: Pt[][];
  landmarks: Pt[];
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
    x + 110 * Math.sin(y / 1400 + 1.3) + 45 * Math.sin((x + y) / 650),
    y + 110 * Math.sin(x / 1600 + 0.4) + 45 * Math.sin((x - y) / 700),
  ];
}

// Обратный изгиб — итерацией: смещение гладкое и не больше 155 м.
function unwarp([px, py]: Pt): Pt {
  let gx = px;
  let gy = py;
  for (let k = 0; k < 6; k++) {
    const [wx, wy] = warp(gx, gy);
    gx += px - wx;
    gy += py - wy;
  }
  return [gx, gy];
}

// Положение линии сетки: магистрали — ровно по шагу, местные улицы — с
// небольшим разбросом, чтобы кварталы были разного размера.
function lineAt(index: number, salt: number): number {
  if (index % ART === 0) {
    return index * PITCH;
  }
  return index * PITCH + (hash2(index, 0, salt) - 0.5) * 40;
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

// ---------------------------------------------------------------- город

interface Segment {
  a: Pt;
  b: Pt;
}

function pointInRing([x, y]: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) {
    const [xi, yi] = ring[k];
    const [xj, yj] = ring[m];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function quad(x0: number, y0: number, x1: number, y1: number): string {
  return ringPath([warp(x0, y0), warp(x1, y0), warp(x1, y1), warp(x0, y1)]);
}

function circle([x, y]: Pt, r: number): string {
  return `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`;
}

type BlockKind = 'none' | 'park' | 'perimeter' | 'towers' | 'houses' | 'industry';

export class City {
  readonly base: CityBase;

  private readonly outline: Pt[];
  private readonly bounds: Box;
  private readonly landmarks: Pt[];
  private readonly diagonals: Segment[];
  private readonly grid = new Map<string, Segment[]>();
  private readonly tiles = new Map<string, CityTile | null>();
  private readonly riverMid: number;
  private readonly i0: number;
  private readonly i1: number;
  private readonly j0: number;
  private readonly j1: number;

  constructor(input: CityInput) {
    this.outline = input.outline;
    this.landmarks = input.landmarks;
    const xs = input.outline.map(p => p[0]);
    const ys = input.outline.map(p => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    this.bounds = { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    this.riverMid = minY + this.bounds.h * 0.58;

    this.i0 = Math.floor(minX / PITCH / ART) * ART - ART;
    this.i1 = Math.ceil((minX + this.bounds.w) / PITCH / ART) * ART + ART;
    this.j0 = Math.floor(minY / PITCH / ART) * ART - ART;
    this.j1 = Math.ceil((minY + this.bounds.h) / PITCH / ART) * ART + ART;

    const { x, y, w, h } = this.bounds;
    this.diagonals = [
      { a: [x + w * 0.04, y + h * 0.12], b: [x + w * 0.96, y + h * 0.78] },
      { a: [x + w * 0.18, y + h * 0.97], b: [x + w * 0.78, y + h * 0.03] },
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

  private inside(p: Pt): boolean {
    return pointInRing(p, this.outline);
  }

  private blocked(p: Pt, pad: number): boolean {
    if (this.riverDistance(p) < ROAD.river / 2 + pad + 6) {
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
    return false;
  }

  // ------------------------------------------------ кварталы

  private superPark(si: number, sj: number): boolean {
    return hash2(si, sj, 11) < 0.07;
  }

  private blockKind(i: number, j: number): BlockKind {
    const cx = (lineX(i) + lineX(i + 1)) / 2;
    const cy = (lineY(j) + lineY(j + 1)) / 2;
    const center = warp(cx, cy);
    if (!this.inside(center)) {
      return 'none';
    }
    const river = this.riverDistance(center);
    if (river < ROAD.river / 2 + 40) {
      return 'none';
    }
    if (river < ROAD.river / 2 + 170) {
      return 'park';
    }
    if (this.superPark(Math.floor(i / ART), Math.floor(j / ART)) || hash2(i, j, 3) < 0.045) {
      return 'park';
    }

    const { x, y, w, h } = this.bounds;
    const dx = (center[0] - (x + w / 2)) / (w / 2);
    const dy = (center[1] - (y + h / 2)) / (h / 2);
    const urban = 0.55 * valueNoise(cx / 4200, cy / 4200, 5) + 0.45 * (1 - Math.min(1, Math.hypot(dx, dy)));
    if (urban < 0.42 && hash2(i, j, 4) < 0.1) {
      return 'industry';
    }
    if (urban > 0.6) {
      return 'perimeter';
    }
    return urban > 0.4 ? 'towers' : 'houses';
  }

  private buildBase(traceLines: Pt[][]): CityBase {
    const outline = ringPath(this.outline);

    // магистрали — непрерывные отрезки внутри района
    let arterials = '';
    const run = (points: Pt[]) => {
      let current: Pt[] = [];
      for (let k = 0; k < points.length; k++) {
        const ok = k === 0 ? this.inside(points[0]) : this.inside(points[k]) || this.inside(points[k - 1]);
        if (ok) {
          current.push(points[k]);
        } else if (current.length > 0) {
          if (current.length > 1) {
            arterials += linePath(current);
          }
          current = [];
        }
      }
      if (current.length > 1) {
        arterials += linePath(current);
      }
    };
    for (let i = this.i0; i <= this.i1; i += ART) {
      const points: Pt[] = [];
      for (let j = this.j0; j <= this.j1; j++) {
        points.push(warp(lineX(i), lineY(j)));
      }
      run(points);
    }
    for (let j = this.j0; j <= this.j1; j += ART) {
      const points: Pt[] = [];
      for (let i = this.i0; i <= this.i1; i++) {
        points.push(warp(lineX(i), lineY(j)));
      }
      run(points);
    }

    const diagonals = this.diagonals.map(segment => linePath([segment.a, segment.b])).join('');
    const traceRoads = traceLines.map(linePath).join('');

    const river: Pt[] = [];
    const { x, w } = this.bounds;
    for (let px = x - 400; px <= x + w + 400; px += 80) {
      river.push([px, this.riverY(px)]);
    }

    // крупные парки — целыми сверхкварталами, видны и на обзоре района
    let parks = '';
    for (let si = this.i0 / ART; si < this.i1 / ART; si++) {
      for (let sj = this.j0 / ART; sj < this.j1 / ART; sj++) {
        if (!this.superPark(si, sj)) {
          continue;
        }
        const center = warp(lineX(si * ART + ART / 2), lineY(sj * ART + ART / 2));
        if (!this.inside(center) || this.riverDistance(center) < 500) {
          continue;
        }
        const ring: Pt[] = [];
        const x0 = lineX(si * ART) + ROAD.arterial / 2;
        const x1 = lineX(si * ART + ART) - ROAD.arterial / 2;
        const y0 = lineY(sj * ART) + ROAD.arterial / 2;
        const y1 = lineY(sj * ART + ART) - ROAD.arterial / 2;
        for (let t = 0; t <= 6; t++) ring.push(warp(x0 + ((x1 - x0) * t) / 6, y0));
        for (let t = 1; t <= 6; t++) ring.push(warp(x1, y0 + ((y1 - y0) * t) / 6));
        for (let t = 1; t <= 6; t++) ring.push(warp(x1 - ((x1 - x0) * t) / 6, y1));
        for (let t = 1; t < 6; t++) ring.push(warp(x0, y1 - ((y1 - y0) * t) / 6));
        parks += ringPath(ring);
      }
    }

    return { outline, arterials, diagonals, traceRoads, river: linePath(river), parks };
  }

  // ------------------------------------------------ тайлы

  tilesIn(box: Box): [number, number][] {
    // запас на изгиб сетки (до 155 м) и на дома у края кадра
    const margin = 220;
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

  private buildTile(ti: number, tj: number, key: string): CityTile | null {
    const kinds: BlockKind[][] = [];
    let any = false;
    for (let a = 0; a < ART; a++) {
      kinds.push([]);
      for (let b = 0; b < ART; b++) {
        const kind = this.blockKind(ti * ART + a, tj * ART + b);
        kinds[a].push(kind);
        any = any || kind !== 'none';
      }
    }
    if (!any) {
      return null;
    }

    const kindAt = (i: number, j: number): BlockKind => {
      const a = i - ti * ART;
      const b = j - tj * ART;
      if (a >= 0 && a < ART && b >= 0 && b < ART) {
        return kinds[a][b];
      }
      return this.blockKind(i, j);
    };

    let parks = '';
    let buildings = '';
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

    const house = (x0: number, y0: number, x1: number, y1: number, label: string | null) => {
      const mid = warp((x0 + x1) / 2, (y0 + y1) / 2);
      const long = Math.max(x1 - x0, y1 - y0);
      const probes: Pt[] =
        long > 30
          ? x1 - x0 > y1 - y0
            ? [mid, warp(x0 + 4, (y0 + y1) / 2), warp(x1 - 4, (y0 + y1) / 2)]
            : [mid, warp((x0 + x1) / 2, y0 + 4), warp((x0 + x1) / 2, y1 - 4)]
          : [mid];
      if (probes.some(p => this.blocked(p, 8) || !this.inside(p))) {
        return;
      }
      buildings += quad(x0, y0, x1, y1);
      if (label) {
        numbers.push({ x: mid[0], y: mid[1], text: label });
      }
    };

    for (let a = 0; a < ART; a++) {
      for (let b = 0; b < ART; b++) {
        const i = ti * ART + a;
        const j = tj * ART + b;
        const kind = kinds[a][b];
        if (kind === 'none') {
          continue;
        }
        const insetL = (isArterial(i) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
        const insetR = (isArterial(i + 1) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
        const insetT = (isArterial(j) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
        const insetB = (isArterial(j + 1) ? ROAD.arterial : ROAD.local) / 2 + SIDEWALK;
        const x0 = lineX(i) + insetL;
        const x1 = lineX(i + 1) - insetR;
        const y0 = lineY(j) + insetT;
        const y1 = lineY(j + 1) - insetB;
        if (x1 - x0 < 30 || y1 - y0 < 30) {
          continue;
        }

        if (kind === 'park') {
          parks += quad(x0 - SIDEWALK + 2, y0 - SIDEWALK + 2, x1 + SIDEWALK - 2, y1 + SIDEWALK - 2);
          const count = Math.floor(((x1 - x0) * (y1 - y0)) / 700);
          for (let k = 0; k < count; k++) {
            const px = x0 + hash2(i * 97 + k, j, 21) * (x1 - x0);
            const py = y0 + hash2(i, j * 89 + k, 22) * (y1 - y0);
            const p = warp(px, py);
            if (!this.blocked(p, 2)) {
              trees += circle(p, 4 + hash2(k, i + j, 23) * 3.5);
            }
          }
          continue;
        }

        // ближайшая улица к точке квартала — для адреса дома
        const edgeAddress = (cx: number, cy: number): string => {
          const options: [number, 'v' | 'h', number, number, 0 | 1][] = [
            [cx - x0, 'v', i, cy, 1],
            [x1 - cx, 'v', i + 1, cy, 0],
            [cy - y0, 'h', j, cx, 1],
            [y1 - cy, 'h', j + 1, cx, 0],
          ];
          options.sort((p, q) => p[0] - q[0]);
          const [, dir, index, t, side] = options[0];
          return address(dir, index, t, side);
        };

        const seed = hash2(i, j, 9);
        if (kind === 'perimeter') {
          const depth = 13 + seed * 5;
          const edge = (along: 'x' | 'y', from: number, to: number, fixed0: number, fixed1: number, dir: 'v' | 'h', index: number, side: 0 | 1) => {
            let t = from;
            let k = 0;
            while (t < to - 12) {
              const len = Math.min(to - t, 22 + hash2(i * 31 + k, j * 17 + index, 12) * 38);
              const gap = hash2(k, i * 13 + j, 13) < 0.3 ? 6 + hash2(k, j, 14) * 10 : 1.5;
              const label = address(dir, index, t + len / 2, side);
              if (along === 'x') {
                house(t, fixed0, t + len, fixed1, label);
              } else {
                house(fixed0, t, fixed1, t + len, label);
              }
              t += len + gap;
              k++;
            }
          };
          edge('x', x0, x1, y0, y0 + depth, 'h', j, 1);
          edge('x', x0, x1, y1 - depth, y1, 'h', j + 1, 0);
          edge('y', y0 + depth + 2, y1 - depth - 2, x0, x0 + depth, 'v', i, 1);
          edge('y', y0 + depth + 2, y1 - depth - 2, x1 - depth, x1, 'v', i + 1, 0);
        } else if (kind === 'towers') {
          // микрорайон: пластины 12×40–70 м в сетке 2×2
          const cells = 2;
          for (let a2 = 0; a2 < cells; a2++) {
            for (let b2 = 0; b2 < cells; b2++) {
              const h = hash2(i * 5 + a2, j * 5 + b2, 15);
              if (h < 0.12) {
                continue;
              }
              const cx0 = x0 + ((x1 - x0) * a2) / cells;
              const cy0 = y0 + ((y1 - y0) * b2) / cells;
              const cw = (x1 - x0) / cells;
              const ch = (y1 - y0) / cells;
              const horizontal = h > 0.56;
              const len = Math.min((horizontal ? cw : ch) - 10, 40 + h * 30);
              const bx = cx0 + (cw - (horizontal ? len : 13)) * hash2(a2, b2 + i, 16);
              const by = cy0 + (ch - (horizontal ? 13 : len)) * hash2(b2, a2 + j, 17);
              const bw = horizontal ? len : 13;
              const bh = horizontal ? 13 : len;
              house(bx, by, bx + bw, by + bh, edgeAddress(bx + bw / 2, by + bh / 2));
            }
          }
        } else if (kind === 'industry') {
          const w = (x1 - x0) * (0.45 + seed * 0.3);
          const h = (y1 - y0) * 0.5;
          house(x0 + 6, y0 + 6, x0 + 6 + w, y0 + 6 + h, edgeAddress(x0 + w / 2, y0 + h / 2));
          house(x1 - 6 - (x1 - x0) * 0.3, y1 - 6 - (y1 - y0) * 0.3, x1 - 6, y1 - 6, edgeAddress(x1 - 20, y1 - 20));
        } else {
          // частный сектор: дома 9–12 м в два ряда вдоль длинных сторон
          const lot = 22;
          const rows: [number, 'h', number, 0 | 1][] = [
            [y0 + 4, 'h', j, 1],
            [y1 - 16, 'h', j + 1, 0],
          ];
          for (const [ry, dir, index, side] of rows) {
            for (let t = x0; t + lot <= x1 + 1; t += lot) {
              const hsh = hash2(Math.round(t), Math.round(ry), 18);
              if (hsh < 0.1) {
                continue;
              }
              const size = 9 + hsh * 3;
              const bx = t + (lot - size) / 2;
              house(bx, ry, bx + size, ry + size, address(dir, index, t + lot / 2, side));
            }
          }
        }
      }
    }

    let streets = '';
    const labels: StreetLabel[] = [];
    const arterialLabels: StreetLabel[] = [];
    // Улица в пределах тайла: участки между перекрёстками, у которых хотя бы
    // с одной стороны есть квартал. Возвращает самый длинный сплошной участок —
    // по нему идёт подпись.
    const street = (count: number, open: (k: number) => boolean, at: (t: number) => Pt): Pt[] => {
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
      for (let k = 0; k < count; k++) {
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
    const segmentsV = (i: number) =>
      street(
        ART,
        b => kindAt(i - 1, tj * ART + b) !== 'none' || kindAt(i, tj * ART + b) !== 'none',
        t => {
          const j = tj * ART + Math.floor(t);
          const f = t - Math.floor(t);
          return warp(lineX(i), lineY(j) + (lineY(j + 1) - lineY(j)) * f);
        }
      );
    const segmentsH = (j: number) =>
      street(
        ART,
        a => kindAt(ti * ART + a, j - 1) !== 'none' || kindAt(ti * ART + a, j) !== 'none',
        t => {
          const i = ti * ART + Math.floor(t);
          const f = t - Math.floor(t);
          return warp(lineX(i) + (lineX(i + 1) - lineX(i)) * f, lineY(j));
        }
      );

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

    for (let a = 0; a < ART; a++) {
      const i = ti * ART + a;
      if (isArterial(i)) {
        const points: Pt[] = [];
        for (let b = 0; b <= ART; b++) {
          points.push(warp(lineX(i), lineY(tj * ART + b)));
        }
        if (points.some(p => this.inside(p))) {
          addLabel(arterialLabels, `v${i}-${key}`, points, streetName('v', i));
        }
        continue;
      }
      addLabel(labels, `v${i}-${key}`, segmentsV(i), streetName('v', i));
    }
    for (let b = 0; b < ART; b++) {
      const j = tj * ART + b;
      if (isArterial(j)) {
        const points: Pt[] = [];
        for (let a = 0; a <= ART; a++) {
          points.push(warp(lineX(ti * ART + a), lineY(j)));
        }
        if (points.some(p => this.inside(p))) {
          addLabel(arterialLabels, `h${j}-${key}`, points, streetName('h', j));
        }
        continue;
      }
      addLabel(labels, `h${j}-${key}`, segmentsH(j), streetName('h', j));
    }

    return { key, parks, buildings, trees, streets, labels, arterialLabels, numbers };
  }

  // ------------------------------------------------ адрес точки

  // Адрес ближайшего дома: улица, на которую выходит квартал, и номер по
  // положению вдоль неё — та же нумерация, что подписана на домах.
  addressAt(p: Pt): string {
    const [gx, gy] = unwarp(p);
    const i = indexOf(gx, lineX);
    const j = indexOf(gy, lineY);
    const options: [number, 'v' | 'h', number, number, 0 | 1][] = [
      [gx - lineX(i), 'v', i, gy, 1],
      [lineX(i + 1) - gx, 'v', i + 1, gy, 0],
      [gy - lineY(j), 'h', j, gx, 1],
      [lineY(j + 1) - gy, 'h', j + 1, gx, 0],
    ];
    options.sort((a, b) => a[0] - b[0]);
    const [, dir, index, t, side] = options[0];
    const origin = dir === 'v' ? lineY(this.j0) : lineX(this.i0);
    const n = Math.max(0, Math.floor((t - origin) / HOUSE_STEP)) * 2 + 1 + side;
    return `${streetName(dir, index)}, ${n}`;
  }
}
