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

// Цепочка пикетов: основная трасса или ветка. Ветка начинается от пикета,
// из которого выходит («ПК44 Г1 ПК0» — от «ПК44»), поэтому её линия
// начинается с точки родителя.
export interface SchemaChain {
  name: string; // префикс кода пикетов: «», «Альфа», «ПК44 Г1»
  label: string; // подпись у конца цепочки
  branch: boolean;
  pickets: Picket[];
  points: Pt[];
}

export interface SchemaSlot {
  anchor: Pt; // пикет или точка объекта
  normal: Pt; // в какую сторону откладывать (для пикета — поперёк цепочки)
  slot: number; // номер места: 0, 1, 2… — по очереди с двух сторон или по спирали
  loose: boolean; // датчик без пикета — раскладываем вокруг точки
}

export interface SchemaModel {
  chains: SchemaChain[];
  spacing: number; // обычный шаг между пикетами, м
  slots: Map<number, SchemaSlot>;
}

// Схема коллектора в его настоящей форме (уровень 2): пикеты — узлы,
// соединённые линиями в порядке номеров, датчики — вокруг своих пикетов
// на расстоянии в пикселях, так что при приближении они расходятся.
export function buildSchema(model: CollectorModel): SchemaModel {
  const groups = new Map<string, Picket[]>();
  for (const picket of model.pickets) {
    const at = picket.code.lastIndexOf('ПК');
    const prefix = (at >= 0 ? picket.code.slice(0, at) : '').trim();
    const group = groups.get(prefix);
    if (group) {
      group.push(picket);
    } else {
      groups.set(prefix, [picket]);
    }
  }
  const byCode = new Map(model.pickets.map(picket => [picket.code.trim(), picket]));
  const number = (picket: Picket) => Number(/ПК(\d+)\s*$/.exec(picket.code)?.[1] ?? 0);

  const chains: SchemaChain[] = [];
  const steps: number[] = [];
  for (const [prefix, list] of Array.from(groups.entries())) {
    const pickets = [...list].sort((a, b) => number(a) - number(b));
    const points = pickets.map(picket => picket.at);
    for (let k = 1; k < points.length; k++) {
      steps.push(Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]));
    }
    // родитель ветки: префикс без последнего слова («Альфа ПК231 Г3» → «Альфа ПК231»)
    const cut = prefix.lastIndexOf(' ');
    const parent = cut > 0 ? byCode.get(prefix.slice(0, cut)) : undefined;
    if (parent && points.length > 0) {
      points.unshift(parent.at);
    }
    const branch = parent !== undefined || /(^|\s)Г\d+$/.test(prefix);
    // у основной трассы без префикса подпись — название трассы из коридоров
    const label = branch
      ? prefix.slice(prefix.lastIndexOf(' ') + 1)
      : prefix || (model.corridors.find(corridor => corridor.kind === 'trace')?.name ?? '');
    chains.push({ name: prefix, label, branch, pickets, points });
  }
  steps.sort((a, b) => a - b);
  const spacing = Math.max(1, steps[Math.floor(steps.length / 2)] ?? 5);

  // направление цепочки у каждого пикета — по соседям
  const normals = new Map<number, Pt>();
  for (const chain of chains) {
    const { pickets } = chain;
    pickets.forEach((picket, k) => {
      const a = pickets[Math.max(0, k - 1)].at;
      const b = pickets[Math.min(pickets.length - 1, k + 1)].at;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy) || 1;
      normals.set(picket.id, [-dy / length, dx / length]);
    });
  }

  const slots = new Map<number, SchemaSlot>();
  const used = new Map<string, number>();
  const partAt = new Map(model.parts.map(part => [part.id, part.at]));
  for (const sensor of [...model.sensors].sort((a, b) => a.id - b.id)) {
    const picket = sensor.picketId !== null ? model.picketById.get(sensor.picketId) : undefined;
    if (picket) {
      const key = `p${picket.id}`;
      const slot = used.get(key) ?? 0;
      used.set(key, slot + 1);
      slots.set(sensor.id, { anchor: picket.at, normal: normals.get(picket.id) ?? [0, -1], slot, loose: false });
      continue;
    }
    // без пикета — у точки своего объекта (ДП, шкаф) или там, где стоит
    const anchor = (sensor.objectId !== null ? partAt.get(sensor.objectId) : undefined) ?? sensor.at;
    const key = `a${anchor[0].toFixed(0)}:${anchor[1].toFixed(0)}`;
    const slot = used.get(key) ?? 0;
    used.set(key, slot + 1);
    slots.set(sensor.id, { anchor, normal: [0, -1], slot, loose: true });
  }

  return { chains, spacing, slots };
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
