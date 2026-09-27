import { ReactNode } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { MonitoredObject } from '../../entities/object/types';
import Button from '../../shared/ui/Button';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { City } from './city';
import { CollectorModel, fallbackSystem, roleLabels, systemByName } from './collector';
import { Geometry, lineLength, lines, midpoint, point, Pt } from './geo';
import { LegendMarker, MapMode, markerState, markerStateLabels } from './MapSymbols';

export type InfoTarget =
  | { type: 'object'; id: number }
  | { type: 'sensor'; id: number }
  | { type: 'entrance'; picketId: number };

export interface CityTrace {
  id: number;
  name: string;
  lines: Pt[][];
  marker: Pt;
}

interface MapInfoCardProps {
  target: InfoTarget;
  mode: MapMode;
  byId: Map<number, MonitoredObject>;
  model: CollectorModel;
  city: City | null;
  cityTraces: CityTrace[];
  works: Set<number>;
  onClose: () => void;
  onOpenCollector: (id: number, mode: MapMode) => void;
  onSelect: (id: number) => void;
  onShowOnMap: (at: Pt) => void;
}

const kindLabels: Record<string, string> = {
  collector: 'Коллектор',
  controlHouse: 'Объект диспетчерского управления',
};

// Точка объекта на карте: геометрия из справочника (ось y вверх) или
// значок трассы на карте района.
function objectPoint(object: MonitoredObject, cityTraces: CityTrace[]): Pt | null {
  const trace = cityTraces.find(item => item.id === object.id);
  if (trace) {
    return trace.marker;
  }
  if (!object.geometryGeoJson) {
    return null;
  }
  try {
    const geometry = JSON.parse(object.geometryGeoJson) as Geometry;
    const line = lines(geometry)[0];
    return point(geometry) ?? (line ? midpoint(line) : null);
  } catch {
    return null;
  }
}

function formatMeters(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2).replace('.', ',')} км` : `${Math.round(meters)} м`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

// Сведения о том, по чему кликнули на карте: объект, датчик или вход.
export default function MapInfoCard({
  target,
  mode,
  byId,
  model,
  city,
  cityTraces,
  works,
  onClose,
  onOpenCollector,
  onSelect,
  onShowOnMap,
}: MapInfoCardProps) {
  const canReadings = usePermission('readings', 'read');
  const canTasks = usePermission('tasks', 'read');
  const canCreateTask = usePermission('tasks', 'create');
  const canHistory = usePermission('objects', 'read');
  const canLogs = canReadings || canTasks;

  const open = (id: number, windowId: string) => {
    onSelect(id);
    openWindow(windowId);
  };

  let title = '';
  let subtitle = '';
  let head: ReactNode = null;
  const rows: ReactNode[] = [];
  const actions: ReactNode[] = [];

  if (target.type === 'object') {
    const object = byId.get(target.id);
    if (!object) {
      return null;
    }
    const state = markerState(object, works);
    const part = model.parts.find(item => item.id === object.id);
    const at = part ? (part.line ? midpoint(part.line) : part.at) : objectPoint(object, cityTraces);
    const parent = object.parentId !== null ? byId.get(object.parentId) : undefined;

    title = object.name;
    subtitle =
      object.level === 2
        ? 'Коллектор'
        : part
          ? roleLabels[part.role] ?? part.role
          : kindLabels[object.kind] ?? object.kind;
    head = (
      <div className={`map-info-state ms-${state}`}>
        <LegendMarker state={state} />
        <span>
          <b>{markerStateLabels[state]}</b>
          {state === 'works' && ` · ${markerStateLabels[object.status]}`} · с{' '}
          {new Date(object.statusAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
    );

    const address = object.address ?? (at && city ? city.addressAt(at) : null);
    if (address) {
      rows.push(
        <Row key="address" label="Адрес">
          {address}
        </Row>
      );
    }
    if (parent && object.level > 2) {
      rows.push(
        <Row key="parent" label="Коллектор">
          {parent.name}
        </Row>
      );
    }
    if (part && part.pkFrom !== null && part.pkTo !== null) {
      rows.push(
        <Row key="pk" label="Пикеты">
          {part.pkFrom === part.pkTo ? `ПК${part.pkFrom}` : `ПК${part.pkFrom} — ПК${part.pkTo}`}
        </Row>
      );
    }

    const loaded = model.parts.length > 0 && model.parts.some(item => byId.get(item.id)?.parentId === object.id);
    if (object.level === 2) {
      const children = Array.from(byId.values()).filter(item => item.parentId === object.id);
      const alarms = children.filter(item => item.status === 'alarm').length;
      rows.push(
        <Row key="parts" label="Объектов">
          {children.length}
          {alarms > 0 && <span className="map-info-alarm"> · в тревоге {alarms}</span>}
        </Row>
      );
      if (loaded) {
        const length = model.corridors.reduce((sum, corridor) => sum + lineLength(corridor.points), 0);
        rows.push(
          <Row key="length" label="Коридоры">
            {formatMeters(length)} · ответвлений {model.corridors.filter(item => item.kind === 'branch').length}
          </Row>,
          <Row key="pickets" label="Пикетов">
            {model.pickets.length}
          </Row>,
          <Row key="sensors" label="Датчиков">
            {model.sensors.length}
          </Row>,
          <Row key="entrances" label="Входов">
            {model.entrances.length}
          </Row>
        );
      }
      if (mode !== 'object') {
        actions.push(
          <Button key="map" variant={mode === 'city' ? 'primary' : 'default'} onClick={() => onOpenCollector(object.id, 'object')}>
            Карта объекта
          </Button>
        );
      }
      if (mode !== 'schema') {
        actions.push(
          <Button key="schema" onClick={() => onOpenCollector(object.id, 'schema')}>
            Схема
          </Button>
        );
      }
    } else {
      const sensors = model.sensors.filter(sensor => sensor.objectId === object.id).length;
      if (sensors > 0) {
        rows.push(
          <Row key="sensors" label="Датчиков">
            {sensors}
          </Row>
        );
      }
      if (mode === 'schema' && at) {
        actions.push(
          <Button key="show" onClick={() => onShowOnMap(at)}>
            Показать на карте
          </Button>
        );
      }
      if (mode === 'object' && parent) {
        actions.push(
          <Button key="schema" onClick={() => onOpenCollector(parent.id, 'schema')}>
            Схема коллектора
          </Button>
        );
      }
    }

    if (canHistory) {
      actions.push(
        <Button key="history" onClick={() => open(object.id, 'objectHistory')}>
          История
        </Button>
      );
    }
    if (canLogs) {
      actions.push(
        <Button key="logs" onClick={() => open(object.id, 'logs')}>
          Логи
        </Button>
      );
    }
    if (canCreateTask) {
      actions.push(
        <Button key="task" onClick={() => open(object.id, 'taskCreate')}>
          Создать заявку
        </Button>
      );
    }
  } else if (target.type === 'sensor') {
    const sensor = model.sensorById.get(target.id);
    if (!sensor) {
      return null;
    }
    const system = systemByName.get(sensor.system) ?? fallbackSystem;
    const owner = sensor.objectId !== null ? byId.get(sensor.objectId) : undefined;
    const picket = sensor.picketId !== null ? model.picketById.get(sensor.picketId) : undefined;
    title = sensor.name || sensor.stype;
    subtitle = 'Датчик';
    head = (
      <div className="map-info-state">
        <span className="map-sys-icon" style={{ background: system.color }} aria-hidden="true">
          {system.letter}
        </span>
        <span>{sensor.system}</span>
      </div>
    );
    rows.push(
      <Row key="stype" label="Тип">
        {sensor.stype}
      </Row>,
      <Row key="picket" label="Пикет">
        {picket?.code ?? 'без привязки к пикету'}
      </Row>
    );
    if (owner) {
      rows.push(
        <Row key="owner" label="Объект">
          {owner.name} · {markerStateLabels[markerState(owner, works)]}
        </Row>
      );
    }
    rows.push(
      <Row key="id" label="Номер">
        {sensor.id}
      </Row>
    );
    if (mode === 'schema') {
      actions.push(
        <Button key="show" onClick={() => onShowOnMap(sensor.at)}>
          Показать на карте
        </Button>
      );
    }
    if (owner && canLogs) {
      actions.push(
        <Button key="logs" onClick={() => open(owner.id, 'logs')}>
          Логи объекта
        </Button>
      );
    }
  } else {
    const entrance = model.entrances.find(item => item.picketId === target.picketId);
    if (!entrance) {
      return null;
    }
    title = `Вход ${entrance.code}`;
    subtitle = 'Вход в коллектор';
    if (city) {
      rows.push(
        <Row key="address" label="Адрес">
          {city.addressAt(entrance.at)}
        </Row>
      );
    }
    rows.push(
      <Row key="sensors" label="Контроль доступа">
        <ul className="map-info-list">
          {entrance.sensors.map(sensor => (
            <li key={sensor.id}>{sensor.name || sensor.stype}</li>
          ))}
        </ul>
      </Row>
    );
    const owner = entrance.sensors[0]?.objectId;
    if (owner !== null && owner !== undefined && canLogs) {
      actions.push(
        <Button key="logs" onClick={() => open(owner, 'logs')}>
          Логи
        </Button>
      );
    }
  }

  return (
    <aside className="map-info" aria-label="Сведения об объекте">
      <header className="map-info-head">
        <div>
          <div className="map-info-kind">{subtitle}</div>
          <h3 className="map-info-title">{title}</h3>
        </div>
        <button className="map-info-close" onClick={onClose} aria-label="Закрыть сведения" title="Закрыть">
          ×
        </button>
      </header>
      {head}
      {rows.length > 0 && <dl className="map-info-rows">{rows}</dl>}
      {actions.length > 0 && <div className="map-info-actions">{actions}</div>}
    </aside>
  );
}
