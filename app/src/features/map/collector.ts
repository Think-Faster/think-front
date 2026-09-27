import { Box, boundsOf, Feature, lines, point, Pt } from './geo';

// Разбор слоёв одного коллектора (уровни 2–4) в удобную для отрисовки форму.

export interface Corridor {
  kind: 'trace' | 'branch';
  name: string;
  points: Pt[];
}

export interface CollectorPart {
  id: number;
  name: string;
  role: string;
  pkFrom: number | null;
  pkTo: number | null;
  line: Pt[] | null;
  at: Pt;
}

export interface Picket {
  id: number;
  code: string;
  short: string;
  at: Pt;
  sensors: number;
}

export interface Sensor {
  id: number;
  objectId: number | null;
  picketId: number | null;
  system: string;
  stype: string;
  name: string;
  at: Pt;
}

export interface Entrance {
  picketId: number;
  code: string;
  at: Pt;
  sensors: Sensor[];
}

export interface CollectorModel {
  corridors: Corridor[];
  parts: CollectorPart[];
  pickets: Picket[];
  picketById: Map<number, Picket>;
  sensors: Sensor[];
  sensorById: Map<number, Sensor>;
  entrances: Entrance[];
  bounds: Box | null;
}

const ENTRANCE_TYPES = new Set(['КД Дверь', 'КД АВ']);

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const num = (value: unknown) => (typeof value === 'number' ? value : null);

export function shortPicket(code: string): string {
  const at = code.lastIndexOf('ПК');
  return at >= 0 ? code.slice(at) : code;
}

export const roleLabels: Record<string, string> = {
  base: 'Диспетчерский пункт',
  control: 'Участок диспетчерского управления',
  trace_guard: 'Охрана трассы',
  cabinet: 'Шкаф / щит на трассе',
};

export function buildCollector(level2: Feature[], level3: Feature[]): CollectorModel {
  const corridors: Corridor[] = [];
  const parts: CollectorPart[] = [];
  const pickets: Picket[] = [];

  for (const feature of level2) {
    const props = feature.properties ?? {};
    const kind = str(props.kind);
    if (kind === 'trace' || kind === 'branch') {
      const name = kind === 'branch' ? `${str(props.trace)} · ${str(props.branch)}` : str(props.trace);
      lines(feature.geometry).forEach(points => corridors.push({ kind, name, points }));
    } else if (kind === 'object') {
      const id = num(props.id);
      if (id === null) {
        continue;
      }
      const line = lines(feature.geometry)[0] ?? null;
      const at = point(feature.geometry) ?? (line ? line[Math.floor(line.length / 2)] : null);
      if (!at) {
        continue;
      }
      parts.push({
        id,
        name: str(props.name),
        role: str(props.role),
        pkFrom: num(props.pk_from),
        pkTo: num(props.pk_to),
        line,
        at,
      });
    } else if (kind === 'picket') {
      const at = point(feature.geometry);
      const id = num(props.id);
      if (at && id !== null) {
        const code = str(props.code);
        pickets.push({ id, code, short: shortPicket(code), at, sensors: num(props.sensors) ?? 0 });
      }
    }
  }

  const picketById = new Map(pickets.map(picket => [picket.id, picket]));
  const sensors: Sensor[] = [];
  for (const feature of level3) {
    const props = feature.properties ?? {};
    const at = point(feature.geometry);
    const id = num(props.id);
    if (!at || id === null) {
      continue;
    }
    sensors.push({
      id,
      objectId: num(props.object_id),
      picketId: num(props.picket_id),
      system: str(props.system),
      stype: str(props.stype),
      name: str(props.name),
      at,
    });
  }

  const byPicket = new Map<number, Entrance>();
  for (const sensor of sensors) {
    if (!ENTRANCE_TYPES.has(sensor.stype) || sensor.picketId === null) {
      continue;
    }
    const picket = picketById.get(sensor.picketId);
    if (!picket) {
      continue;
    }
    const entrance = byPicket.get(picket.id);
    if (entrance) {
      entrance.sensors.push(sensor);
    } else {
      byPicket.set(picket.id, { picketId: picket.id, code: picket.code, at: picket.at, sensors: [sensor] });
    }
  }

  return {
    corridors,
    parts,
    pickets,
    picketById,
    sensors,
    sensorById: new Map(sensors.map(sensor => [sensor.id, sensor])),
    entrances: Array.from(byPicket.values()),
    bounds: boundsOf([...corridors.map(corridor => corridor.points), ...parts.map(part => [part.at])], 0.08),
  };
}

// ---------------------------------------------------------------- схема

export interface SchemaModel {
  corridors: Corridor[];
  pickets: Picket[];
  sensors: { id: number; system: string; at: Pt }[];
  picketAt: Map<number, Pt>;
  bounds: Box | null;
}

// Принципиальная схема (уровень 4): коридоры развёрнуты в прямые, датчики
// разнесены по полосам в несколько метров. Схема длинная и плоская
// (километры на десятки метров), поэтому по вертикали её растягиваем —
// иначе полосы датчиков сливаются в одну линию.
export function buildSchema(level4: Feature[]): SchemaModel {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const feature of level4) {
    for (const line of lines(feature.geometry)) {
      for (const [x, y] of line) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    const at = point(feature.geometry);
    if (at) {
      minX = Math.min(minX, at[0]);
      maxX = Math.max(maxX, at[0]);
      minY = Math.min(minY, at[1]);
      maxY = Math.max(maxY, at[1]);
    }
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const stretch = Math.min(14, Math.max(1, spanX / spanY / 3.2));
  const scale = ([x, y]: Pt): Pt => [x, y * stretch];

  const corridors: Corridor[] = [];
  const pickets: Picket[] = [];
  const sensors: SchemaModel['sensors'] = [];

  for (const feature of level4) {
    const props = feature.properties ?? {};
    const kind = str(props.kind);
    if (kind === 'trace' || kind === 'branch') {
      const name = kind === 'branch' ? `${str(props.trace)} · ${str(props.branch)}` : str(props.trace);
      lines(feature.geometry).forEach(points => corridors.push({ kind, name, points: points.map(scale) }));
    } else if (kind === 'picket') {
      const at = point(feature.geometry);
      const id = num(props.id);
      if (at && id !== null) {
        const code = str(props.code);
        pickets.push({ id, code, short: shortPicket(code), at: scale(at), sensors: 0 });
      }
    } else if (kind === 'sensor') {
      const at = point(feature.geometry);
      const id = num(props.id);
      if (at && id !== null) {
        sensors.push({ id, system: str(props.system), at: scale(at) });
      }
    }
  }

  return {
    corridors,
    pickets,
    sensors,
    picketAt: new Map(pickets.map(picket => [picket.id, picket.at])),
    bounds: boundsOf(
      [...corridors.map(corridor => corridor.points), sensors.map(sensor => sensor.at)],
      0.05
    ),
  };
}

// Подсистемы датчиков: цвет и буква значка на схеме.
export const systems: { name: string; letter: string; color: string }[] = [
  { name: 'Пожарная охрана', letter: 'П', color: '#d4622a' },
  { name: 'Газовая охрана', letter: 'Г', color: '#7c55c2' },
  { name: 'Диспетчерский контроль', letter: 'Д', color: '#175289' },
  { name: 'Охранная подсистема', letter: 'О', color: '#23847e' },
  { name: 'Температурная подсистема', letter: 'Т', color: '#b3456f' },
  { name: 'Диагностическая подсистема', letter: 'И', color: '#5d6b80' },
];

export const systemByName = new Map(systems.map(system => [system.name, system]));

export const fallbackSystem = { name: 'Прочее', letter: '·', color: '#5d6b80' };
