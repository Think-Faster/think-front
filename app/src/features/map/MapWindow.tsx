import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { MonitoredObject } from '../../entities/object/types';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import { useObjects } from '../objects/hooks/useObjects';
import { objectStatusLabels, objectStatusOrder } from '../objects/objectLabels';
import { Feature, Geometry, MapView, Position, useMapLayers } from './hooks/useMapLayers';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAN_THRESHOLD = 4;
const MIN_ZOOM_SHARE = 0.02;

// Координаты схемы — условные метры (tf.crs = 'schematic-m'), ось y вверх.
// В SVG ось y вниз, поэтому y переворачиваем при отрисовке.
function flip([x, y]: Position): [number, number] {
  return [x, -y];
}

function linePath(points: Position[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${flip(point).join(' ')}`).join('');
}

function geometryPath(geometry: Geometry): string {
  switch (geometry.type) {
    case 'LineString':
      return linePath(geometry.coordinates as Position[]);
    case 'MultiLineString':
      return (geometry.coordinates as Position[][]).map(linePath).join('');
    case 'Polygon':
      return (geometry.coordinates as Position[][]).map(ring => `${linePath(ring)}Z`).join('');
    case 'MultiPolygon':
      return (geometry.coordinates as Position[][][])
        .flatMap(polygon => polygon.map(ring => `${linePath(ring)}Z`))
        .join('');
    default:
      return '';
  }
}

function collectPositions(geometry: Geometry, into: Position[]) {
  const walk = (value: unknown) => {
    if (Array.isArray(value) && typeof value[0] === 'number') {
      into.push(value as Position);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    }
  };
  walk(geometry.coordinates);
}

function boundsOf(features: Feature[]): Box | null {
  const positions: Position[] = [];
  features.forEach(feature => feature.geometry && collectPositions(feature.geometry, positions));
  if (positions.length === 0) {
    return null;
  }

  const xs = positions.map(position => position[0]);
  const ys = positions.map(position => -position[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - minX, 1);
  const h = Math.max(Math.max(...ys) - minY, 1);
  const pad = Math.max(w, h) * 0.04;

  return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 };
}

function featureObjectId(feature: Feature): number | null {
  const id = feature.properties?.id;
  return typeof id === 'number' ? id : null;
}

// «Карта»: схема района из слоёв BFF (/objects/{id}/layers), нарисованная
// своим SVG — координаты в метрах схемы, тайловая подложка к ним не
// подходит. Цвет участка — статус объекта из справочника. Клик выбирает
// объект: «История объектов», «Журнал данных» и «Логи» переключаются на него.
export default function MapWindow() {
  const { objects, loading: objectsLoading, error: objectsError } = useObjects();
  const selectedId = useSelectionStore(state => state.objectId);
  const setSelectedId = useSelectionStore(state => state.setObjectId);
  // Кнопка «Логи» — тем, кому видно окно (windowRegistry: readings или tasks).
  const canReadings = usePermission('readings', 'read');
  const canTasks = usePermission('tasks', 'read');
  const canLogs = canReadings || canTasks;

  const district = useMemo(() => objects.find(object => object.level === 1), [objects]);
  const [view, setView] = useState<MapView | null>(null);

  useEffect(() => {
    if (district && !view) {
      setView({ level: 1, objectId: district.id });
    }
  }, [district, view]);

  const { features, loading, error } = useMapLayers(view);
  const byId = useMemo(() => new Map(objects.map(object => [object.id, object])), [objects]);
  const bounds = useMemo(() => boundsOf(features), [features]);

  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => setBox(bounds), [bounds]);

  const hasBox = box !== null;

  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef<{ x: number; y: number; box: Box; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  // Колесо — зум вокруг курсора. Слушатель нативный: у React onWheel
  // пассивный, и без preventDefault прокручивалось бы тело окна.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !bounds || !hasBox) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svg!.getBoundingClientRect();
      setBox(current => {
        if (!current || !bounds) {
          return current;
        }
        const factor = event.deltaY > 0 ? 1.2 : 1 / 1.2;
        const w = Math.min(Math.max(current.w * factor, bounds.w * MIN_ZOOM_SHARE), bounds.w * 2);
        const h = (w / current.w) * current.h;
        const fx = (event.clientX - rect.left) / rect.width;
        const fy = (event.clientY - rect.top) / rect.height;
        return { x: current.x + (current.w - w) * fx, y: current.y + (current.h - h) * fy, w, h };
      });
    }

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [bounds, hasBox]);

  function handleDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !box) {
      return;
    }
    panRef.current = { x: event.clientX, y: event.clientY, box, moved: false };
  }

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!pan || !svg) {
      return;
    }

    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) {
      return;
    }
    if (!pan.moved) {
      pan.moved = true;
      svg.setPointerCapture(event.pointerId);
    }

    const rect = svg.getBoundingClientRect();
    // preserveAspectRatio="meet": масштаб — по более тесной стороне.
    const scale = Math.max(pan.box.w / rect.width, pan.box.h / rect.height);
    setBox({ ...pan.box, x: pan.box.x - dx * scale, y: pan.box.y - dy * scale });
  }

  function handleUp() {
    suppressClickRef.current = Boolean(panRef.current?.moved);
    panRef.current = null;
  }

  const selectObject = useCallback(
    (id: number) => {
      if (suppressClickRef.current) {
        return;
      }
      setSelectedId(id);
      openWindow('objectHistory');
    },
    [setSelectedId]
  );

  const selected = selectedId !== null ? byId.get(selectedId) : undefined;
  const unit = box ? Math.max(box.w, box.h) / 160 : 1;

  function renderFeature(feature: Feature, index: number) {
    const geometry = feature.geometry;
    if (!geometry) {
      return null;
    }

    const props = feature.properties ?? {};
    const id = featureObjectId(feature);
    const object: MonitoredObject | undefined = id !== null ? byId.get(id) : undefined;
    const kind = typeof props.kind === 'string' ? props.kind : '';
    const isArea = props.level === 1 || geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
    const clickable = Boolean(object) && !isArea;
    const classes = [
      'map-feature',
      isArea ? 'map-area' : '',
      kind ? `map-${kind}` : '',
      object ? `st-${object.status}` : '',
      clickable ? 'map-clickable' : '',
      id !== null && id === selectedId ? 'map-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const title = object ? `${object.name} — ${objectStatusLabels[object.status]}` : undefined;
    const onClick = clickable && id !== null ? () => selectObject(id) : undefined;

    if (geometry.type === 'Point') {
      const [cx, cy] = flip(geometry.coordinates as Position);
      const radius = kind === 'picket' ? unit * 0.35 : unit * 0.9;
      return (
        <circle key={index} className={classes} cx={cx} cy={cy} r={radius} onClick={onClick}>
          {title && <title>{title}</title>}
        </circle>
      );
    }

    const d = geometryPath(geometry);
    if (!d) {
      return null;
    }

    return (
      <g key={index} className={classes} onClick={onClick}>
        {clickable && <path className="map-hit" d={d} vectorEffect="non-scaling-stroke" />}
        <path d={d} vectorEffect="non-scaling-stroke" />
        {title && <title>{title}</title>}
      </g>
    );
  }

  // Площади — снизу, точки — сверху, чтобы по ним можно было попасть.
  const ordered = [...features].sort((a, b) => layerRank(a) - layerRank(b));

  const collector = selected && selected.level === 2 ? selected : undefined;
  const inCollector = view?.level === 2 ? byId.get(view.objectId) : undefined;

  if (objectsLoading && objects.length === 0) {
    return <EmptyState>Загрузка…</EmptyState>;
  }
  if (objectsError) {
    return <div className="status-note rej">{objectsError}</div>;
  }
  if (!district) {
    return <EmptyState>В справочнике нет района (объекта уровня 1) — схеме не на что опереться</EmptyState>;
  }

  return (
    <div className="map">
      <div className="map-bar">
        <span className="map-crumbs">
          {inCollector ? (
            <>
              <button className="map-back" onClick={() => setView({ level: 1, objectId: district.id })}>
                ← {district.name}
              </button>
              <span> / {inCollector.name}</span>
            </>
          ) : (
            district.name
          )}
        </span>

        <button className="map-fit" onClick={() => setBox(bounds)} disabled={!bounds} title="Показать всю схему">
          Вся схема
        </button>
      </div>

      <div className="map-stage">
        {loading && <div className="map-note">Загрузка схемы…</div>}
        {error && <div className="map-note status-note rej">{error}</div>}
        {!loading && !error && features.length === 0 && <div className="map-note">Для этого уровня слоёв нет</div>}

        {box && (
          <svg
            ref={svgRef}
            className="map-svg"
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            role="img"
            aria-label={`Схема: ${inCollector?.name ?? district.name}`}
          >
            {ordered.map(renderFeature)}
          </svg>
        )}
      </div>

      <div className="map-foot">
        <ul className="map-legend" aria-label="Статусы объектов">
          {objectStatusOrder.map(status => (
            <li key={status}>
              <span className={`map-dot st-${status}`} aria-hidden="true" />
              {objectStatusLabels[status]}
            </li>
          ))}
        </ul>

        {selected && (
          <div className="map-selection">
            <span className="map-selection-name">
              {selected.name} · {objectStatusLabels[selected.status]}
            </span>
            {collector && view?.level === 1 && (
              <Button onClick={() => setView({ level: 2, objectId: collector.id })}>Схема участка</Button>
            )}
            {canLogs && <Button onClick={() => openWindow('logs')}>Логи</Button>}
            <Button variant="primary" onClick={() => openWindow('objectHistory')}>
              История
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function layerRank(feature: Feature): number {
  const type = feature.geometry?.type;
  if (type === 'Polygon' || type === 'MultiPolygon') {
    return 0;
  }
  if (type === 'Point') {
    return 2;
  }
  return 1;
}
