// Геометрия карты. Слои BFF — в условных метрах схемы (tf.crs = 'schematic-m')
// с осью y вверх; рисуем в SVG, где y вниз, поэтому всё переводим в «экранные
// метры» функцией flip один раз при разборе слоя.

export type Position = number[];
export type Pt = [number, number];

export interface Geometry {
  type: string;
  coordinates: unknown;
}

export interface Feature {
  geometry: Geometry | null;
  properties: Record<string, unknown> | null;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function flip([x, y]: Position): Pt {
  return [x, -y];
}

export function linePath(points: Pt[]): string {
  let d = '';
  for (let k = 0; k < points.length; k++) {
    d += `${k === 0 ? 'M' : 'L'}${points[k][0].toFixed(1)} ${points[k][1].toFixed(1)}`;
  }
  return d;
}

export function ringPath(points: Pt[]): string {
  return `${linePath(points)}Z`;
}

// Все линии геометрии в экранных метрах: LineString — одна, MultiLineString —
// несколько, у полигона — кольца.
export function lines(geometry: Geometry | null): Pt[][] {
  if (!geometry) {
    return [];
  }
  switch (geometry.type) {
    case 'LineString':
      return [(geometry.coordinates as Position[]).map(flip)];
    case 'MultiLineString':
    case 'Polygon':
      return (geometry.coordinates as Position[][]).map(line => line.map(flip));
    case 'MultiPolygon':
      return (geometry.coordinates as Position[][][]).flatMap(polygon => polygon.map(line => line.map(flip)));
    default:
      return [];
  }
}

export function point(geometry: Geometry | null): Pt | null {
  return geometry?.type === 'Point' ? flip(geometry.coordinates as Position) : null;
}

export function boundsOf(polylines: Pt[][], pad = 0.04): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const line of polylines) {
    for (const [x, y] of line) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX === Infinity) {
    return null;
  }
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const p = Math.max(w, h) * pad;
  return { x: minX - p, y: minY - p, w: w + p * 2, h: h + p * 2 };
}

export function lineLength(line: Pt[]): number {
  let total = 0;
  for (let k = 1; k < line.length; k++) {
    total += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
  }
  return total;
}

// Точка на середине ломаной — туда ставим значок протяжённого объекта.
export function midpoint(line: Pt[]): Pt {
  if (line.length === 1) {
    return line[0];
  }
  let rest = lineLength(line) / 2;
  for (let k = 1; k < line.length; k++) {
    const [ax, ay] = line[k - 1];
    const [bx, by] = line[k];
    const step = Math.hypot(bx - ax, by - ay);
    if (step >= rest && step > 0) {
      const t = rest / step;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    rest -= step;
  }
  return line[line.length - 1];
}

// Ближайшая к p точка отрезка ab и квадрат расстояния до неё.
export function nearestOnSegment(p: Pt, a: Pt, b: Pt): { at: Pt; d2: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  const at: Pt = [a[0] + dx * t, a[1] + dy * t];
  return { at, d2: (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2 };
}

export function nearestOnLines(p: Pt, polylines: Pt[][]): Pt | null {
  let best: { at: Pt; d2: number } | null = null;
  for (const line of polylines) {
    for (let k = 1; k < line.length; k++) {
      const hit = nearestOnSegment(p, line[k - 1], line[k]);
      if (!best || hit.d2 < best.d2) {
        best = hit;
      }
    }
  }
  return best ? best.at : null;
}

// Прореживание ломаной: точки не чаще step метров — для дорог по трассам.
export function thin(line: Pt[], step: number): Pt[] {
  if (line.length <= 2) {
    return line;
  }
  const out: Pt[] = [line[0]];
  for (let k = 1; k < line.length - 1; k++) {
    const last = out[out.length - 1];
    if (Math.hypot(line[k][0] - last[0], line[k][1] - last[1]) >= step) {
      out.push(line[k]);
    }
  }
  out.push(line[line.length - 1]);
  return out;
}
