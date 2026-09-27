import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { MonitoredObject } from '../../entities/object/types';
import { taskRepository } from '../../entities/task/taskRepository';
import EmptyState from '../../shared/ui/EmptyState';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { useObjects } from '../objects/hooks/useObjects';
import { City } from './city';
import CityLayer from './CityLayer';
import { buildCollector, buildSchema, CollectorModel, fallbackSystem, SchemaModel, systemByName, systems } from './collector';
import { Box, boundsOf, lineLength, lines, linePath, midpoint, nearestOnLines, point, Pt } from './geo';
import { useMapLayer } from './hooks/useMapLayers';
import MapInfoCard, { CityTrace, InfoTarget } from './MapInfoCard';
import { useMapRequest } from './mapRequest';
import {
  BaseGlyph,
  CabinetGlyph,
  EntranceGlyph,
  LegendMarker,
  MapMode,
  markerState,
  markerStateLabels,
  markerStateOrder,
  StateBadge,
  StatusMarker,
} from './MapSymbols';

const PAN_THRESHOLD = 4;
const ZOOM_STEP = 1.35;

interface CityBase {
  id: number;
  name: string;
  at: Pt;
}

function niceStep(raw: number): number {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]) {
    if (step >= raw) {
      return step;
    }
  }
  return 1000;
}

// «Карта» для стенда. Три режима:
// — район: город (генерируется, city.ts), коллекторы пунктиром под улицами,
//   значок состояния на каждом; клик — провалиться в коллектор;
// — карта объекта: тот же город крупно, коридоры коллектора и ответвления
//   пунктиром, участки цветом состояния, входы (люки), ДП и шкафы;
// — схема: принципиальная схема коллектора — коридоры прямыми, пикеты,
//   датчики по подсистемам и их связь с пикетами и участками.
// Клик по любому объекту открывает карточку сведений (MapInfoCard).
export default function MapWindow() {
  const { objects, loading: objectsLoading, error: objectsError } = useObjects();
  const selectedId = useSelectionStore(state => state.objectId);
  const setSelectedId = useSelectionStore(state => state.setObjectId);
  const canTasks = usePermission('tasks', 'read');

  const byId = useMemo(() => new Map(objects.map(object => [object.id, object])), [objects]);
  const district = useMemo(() => objects.find(object => object.level === 1), [objects]);
  const collectors = useMemo(
    () => objects.filter(object => object.level === 2).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [objects]
  );

  const [mode, setMode] = useState<MapMode>('city');
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [info, setInfo] = useState<InfoTarget | null>(null);
  const [focus, setFocus] = useState<Pt[] | null>(null);
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);

  // ---------------------------------------------------------------- данные

  const cityLayer = useMapLayer(district?.id ?? null, 1);
  const l2 = useMapLayer(collectorId, 2);
  const l3 = useMapLayer(collectorId, 3);
  const l4 = useMapLayer(mode === 'schema' ? collectorId : null, 4);

  const { city, cityTraces, cityBases } = useMemo(() => {
    let outline: Pt[] | null = null;
    const traces: CityTrace[] = [];
    const bases: CityBase[] = [];
    for (const feature of cityLayer.features) {
      const props = feature.properties ?? {};
      const id = typeof props.id === 'number' ? props.id : null;
      const type = feature.geometry?.type;
      if (type === 'Polygon' && !outline) {
        outline = lines(feature.geometry)[0] ?? null;
      } else if ((type === 'MultiLineString' || type === 'LineString') && id !== null) {
        const parts = lines(feature.geometry);
        const longest = parts.reduce((a, b) => (lineLength(b) > lineLength(a) ? b : a), parts[0]);
        traces.push({ id, name: String(props.name ?? ''), lines: parts, marker: midpoint(longest) });
      } else if (type === 'Point' && id !== null) {
        const at = point(feature.geometry);
        if (at) {
          bases.push({ id, name: String(props.name ?? ''), at });
        }
      }
    }
    const built =
      outline && outline.length > 2
        ? new City({ outline, traces: traces.flatMap(trace => trace.lines), landmarks: bases.map(base => base.at) })
        : null;
    return { city: built, cityTraces: traces, cityBases: bases };
  }, [cityLayer.features]);

  const collector = useMemo(() => buildCollector(l2.features, l3.features), [l2.features, l3.features]);
  const schema = useMemo(() => buildSchema(l4.features), [l4.features]);

  // Идут работы: заявки, по которым инженер уже на объекте.
  const [works, setWorks] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!canTasks) {
      return;
    }
    let cancelled = false;
    taskRepository
      .getList({ status: 'engineerWorking', page: 1, pageSize: 200 })
      .then(result => {
        if (!cancelled) {
          setWorks(new Set(result.items.map(task => task.objectId)));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canTasks]);

  // работы на участке — работы и на его коллекторе
  const worksAll = useMemo(() => {
    const all = new Set(works);
    works.forEach(id => {
      const parent = byId.get(id)?.parentId;
      if (parent !== null && parent !== undefined) {
        all.add(parent);
      }
    });
    return all;
  }, [works, byId]);

  // ---------------------------------------------------------------- кадр

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const hasStage = Boolean(district);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [hasStage]);

  const contentBounds = useMemo((): Box | null => {
    if (mode === 'city') {
      return boundsOf(cityTraces.flatMap(trace => trace.lines), 0.06);
    }
    if (mode === 'object') {
      return collector.bounds;
    }
    return schema.bounds;
  }, [mode, cityTraces, collector.bounds, schema.bounds]);

  const [box, setBox] = useState<Box | null>(null);
  const fittedRef = useRef('');
  const fitKey = mode === 'city' ? 'city' : `${mode}:${collectorId}`;

  useEffect(() => {
    if (contentBounds && fittedRef.current !== fitKey) {
      fittedRef.current = fitKey;
      setBox(contentBounds);
    }
  }, [fitKey, contentBounds]);

  // Приблизить к объекту: «показать на карте», переход из заявки.
  useEffect(() => {
    if (!focus || mode !== 'object' || !collector.bounds || fittedRef.current !== fitKey) {
      return;
    }
    const bounds = boundsOf([focus], 0);
    if (bounds) {
      const w = Math.max(bounds.w * 1.6, 420);
      const h = Math.max(bounds.h * 1.6, 300);
      // справа — карточка сведений: кадр шире вправо, объект остаётся левее неё
      setBox({ x: bounds.x + bounds.w / 2 - w / 2, y: bounds.y + bounds.h / 2 - h / 2, w: w * 1.6, h });
    }
    setFocus(null);
  }, [focus, mode, collector.bounds, fitKey]);

  // Фокус на участке ждёт, пока загрузится слой его коллектора.
  useEffect(() => {
    if (pendingFocus === null || collector.parts.length === 0) {
      return;
    }
    const part = collector.parts.find(item => item.id === pendingFocus);
    if (!part) {
      return;
    }
    setPendingFocus(null);
    setMode('object');
    setFocus(part.line ?? [part.at]);
  }, [pendingFocus, collector.parts]);

  // Видимая область: viewBox вписан в окно (meet), лишнее — по краям.
  const unit = box ? Math.max(box.w / size.w, box.h / size.h) : 1;
  const view: Box | null = box
    ? {
        x: box.x + box.w / 2 - (size.w * unit) / 2,
        y: box.y + box.h / 2 - (size.h * unit) / 2,
        w: size.w * unit,
        h: size.h * unit,
      }
    : null;

  const limitsRef = useRef({ min: 60, max: 60000 });
  limitsRef.current = {
    min: mode === 'schema' ? 25 : 70,
    max: contentBounds ? Math.max(contentBounds.w, contentBounds.h) * 3 : 60000,
  };

  const zoomAt = useCallback((factor: number, fx = 0.5, fy = 0.5) => {
    setBox(current => {
      if (!current) {
        return current;
      }
      const { min, max } = limitsRef.current;
      const w = Math.min(Math.max(current.w * factor, min), max);
      const h = (w / current.w) * current.h;
      return { x: current.x + (current.w - w) * fx, y: current.y + (current.h - h) * fy, w, h };
    });
  }, []);

  const hasBox = box !== null;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !hasBox) {
      return;
    }
    // Нативный слушатель: у React onWheel пассивный, и без preventDefault
    // прокручивалось бы окно.
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svg!.getBoundingClientRect();
      zoomAt(
        event.deltaY > 0 ? 1.2 : 1 / 1.2,
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height
      );
    }
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [hasBox, zoomAt]);

  const panRef = useRef<{ x: number; y: number; box: Box; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  function handleDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !box) {
      return;
    }
    suppressClickRef.current = false;
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
    const scale = Math.max(pan.box.w / rect.width, pan.box.h / rect.height);
    setBox({ ...pan.box, x: pan.box.x - dx * scale, y: pan.box.y - dy * scale });
  }

  function handleUp() {
    suppressClickRef.current = Boolean(panRef.current?.moved);
    panRef.current = null;
  }

  // ---------------------------------------------------------------- переходы

  // Объект, выбранный в других окнах (заявка, история, журнал), карта
  // показывает сама. Свои клики отмечаем в handledRef, чтобы не
  // обрабатывать их второй раз.
  const handledRef = useRef<number | null>(null);

  const select = useCallback(
    (id: number) => {
      handledRef.current = id;
      setSelectedId(id);
    },
    [setSelectedId]
  );

  const collectorRef = useRef(collectorId);
  collectorRef.current = collectorId;

  const navigate = useCallback(
    (object: MonitoredObject) => {
      handledRef.current = object.id;
      if (object.level <= 1) {
        setMode('city');
        setInfo(null);
        return;
      }
      const parent = object.level === 2 ? object : object.parentId !== null ? byId.get(object.parentId) : undefined;
      if (!parent) {
        return;
      }
      const sameCollector = collectorRef.current === parent.id;
      setMode(current => (current === 'city' || !sameCollector ? 'object' : current));
      setCollectorId(parent.id);
      setInfo({ type: 'object', id: object.id });
      if (object.level > 2) {
        setPendingFocus(object.id);
      }
    },
    [byId]
  );

  useEffect(() => {
    if (selectedId === null || selectedId === handledRef.current) {
      return;
    }
    const object = byId.get(selectedId);
    if (object) {
      navigate(object);
    }
  }, [selectedId, byId, navigate]);

  // «Карта объекта» из заявки — просьба с номером, исполняется и повторно.
  const requestSeq = useMapRequest(state => state.seq);
  const requestId = useMapRequest(state => state.objectId);
  const requestRef = useRef(0);
  useEffect(() => {
    if (requestSeq === requestRef.current || requestId === null) {
      return;
    }
    const object = byId.get(requestId);
    if (object) {
      requestRef.current = requestSeq;
      navigate(object);
    }
  }, [requestSeq, requestId, byId, navigate]);

  const guarded =
    <T,>(action: (value: T) => void) =>
    (value: T) => {
      if (!suppressClickRef.current) {
        action(value);
      }
    };

  const openCollector = (id: number, next: MapMode) => {
    select(id);
    setInfo({ type: 'object', id });
    setCollectorId(id);
    setMode(next);
  };

  const clickCollector = guarded((id: number) => openCollector(id, 'object'));

  const clickObject = guarded((id: number) => {
    select(id);
    setInfo({ type: 'object', id });
  });

  const clickInfo = guarded((target: InfoTarget) => setInfo(target));

  function showOnMap(at: Pt) {
    setMode('object');
    setFocus([at]);
  }

  // ---------------------------------------------------------------- отрисовка

  if (objectsLoading && objects.length === 0) {
    return <EmptyState>Загрузка…</EmptyState>;
  }
  if (objectsError) {
    return <div className="status-note rej">{objectsError}</div>;
  }
  if (!district) {
    return <EmptyState>В справочнике нет района (объекта уровня 1) — карте не на что опереться</EmptyState>;
  }

  const current = collectorId !== null ? byId.get(collectorId) : undefined;
  const loading =
    cityLayer.loading || (mode !== 'city' && (l2.loading || l3.loading)) || (mode === 'schema' && l4.loading);
  const error = cityLayer.error || (mode !== 'city' ? l2.error || l3.error : '') || (mode === 'schema' ? l4.error : '');

  return (
    <div className="map">
      <div className="map-bar">
        <nav className="map-crumbs" aria-label="Уровень карты">
          <button
            className={`map-crumb${mode === 'city' ? ' active' : ''}`}
            onClick={() => {
              setMode('city');
              setInfo(null);
            }}
          >
            {district.name}
          </button>
          <span className="map-crumb-sep" aria-hidden="true">
            ›
          </span>
          <select
            className="map-collector"
            aria-label="Карта объекта"
            value={collectorId ?? ''}
            onChange={event => {
              const id = Number(event.target.value);
              if (id) {
                openCollector(id, mode === 'schema' ? 'schema' : 'object');
              }
            }}
          >
            <option value="" disabled>
              Выберите объект…
            </option>
            {collectors.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </nav>

        <div className="map-modes" role="tablist" aria-label="Вид карты">
          <button
            role="tab"
            aria-selected={mode === 'city'}
            className={mode === 'city' ? 'active' : ''}
            onClick={() => setMode('city')}
          >
            Район
          </button>
          <button
            role="tab"
            aria-selected={mode === 'object'}
            className={mode === 'object' ? 'active' : ''}
            disabled={collectorId === null}
            onClick={() => setMode('object')}
          >
            Карта объекта
          </button>
          <button
            role="tab"
            aria-selected={mode === 'schema'}
            className={mode === 'schema' ? 'active' : ''}
            disabled={collectorId === null}
            onClick={() => setMode('schema')}
          >
            Схема
          </button>
        </div>
      </div>

      <div className={`map-stage map-stage-${mode}`} ref={stageRef}>
        {loading && <div className="map-note">Загрузка карты…</div>}
        {error && <div className="map-note status-note rej">{error}</div>}

        {box && view && (
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
            aria-label={
              mode === 'city'
                ? `Карта: ${district.name}`
                : `${mode === 'schema' ? 'Схема' : 'Карта'}: ${current?.name ?? ''}`
            }
          >
            {mode !== 'schema' && city && <CityLayer city={city} box={view} unit={unit} />}

            {mode === 'city' && (
              <g className="map-city-overlay">
                {cityTraces.map(trace => {
                  const object = byId.get(trace.id);
                  const d = trace.lines.map(linePath).join('');
                  return (
                    <g
                      key={trace.id}
                      className={`map-trace st-${object?.status ?? 'offline'} map-clickable`}
                      onClick={() => clickCollector(trace.id)}
                    >
                      <path className="map-hit" d={d} strokeWidth={16 * unit} />
                      <path className="map-trace-halo" d={d} strokeWidth={7 * unit} />
                      <path
                        className="map-trace-line"
                        d={d}
                        strokeWidth={3.2 * unit}
                        strokeDasharray={`${9 * unit} ${6 * unit}`}
                      />
                      <title>{object?.name ?? trace.name}</title>
                    </g>
                  );
                })}
                {unit < 14 &&
                  cityBases.map(base => (
                    <g
                      key={base.id}
                      className="map-clickable"
                      transform={`translate(${base.at[0]} ${base.at[1]}) scale(${unit * 0.8})`}
                      onClick={() => clickObject(base.id)}
                    >
                      <BaseGlyph />
                      <StateBadge state={markerState(byId.get(base.id), worksAll)} />
                      <title>
                        {base.name} — {markerStateLabels[markerState(byId.get(base.id), worksAll)]}
                      </title>
                    </g>
                  ))}
                {cityTraces.map(trace => {
                  const object = byId.get(trace.id);
                  const state = markerState(object, worksAll);
                  return (
                    <g key={trace.id}>
                      <StatusMarker
                        x={trace.marker[0]}
                        y={trace.marker[1]}
                        unit={unit}
                        state={state}
                        selected={selectedId === trace.id}
                        title={`${object?.name ?? trace.name} — ${markerStateLabels[state]}`}
                        onClick={() => clickCollector(trace.id)}
                      />
                      <text
                        className="map-label"
                        x={trace.marker[0]}
                        y={trace.marker[1] + 24 * unit}
                        fontSize={11 * unit}
                        strokeWidth={3 * unit}
                      >
                        {object?.name ?? trace.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {mode === 'object' && (
              <ObjectOverlay
                collectorId={collectorId}
                model={collector}
                cityTraces={cityTraces}
                byId={byId}
                works={worksAll}
                unit={unit}
                view={view}
                selectedId={selectedId}
                info={info}
                onCollector={clickCollector}
                onObject={clickObject}
                onInfo={clickInfo}
              />
            )}

            {mode === 'schema' && (
              <SchemaOverlay
                schema={schema}
                model={collector}
                byId={byId}
                works={worksAll}
                unit={unit}
                view={view}
                info={info}
                onObject={clickObject}
                onInfo={clickInfo}
              />
            )}
          </svg>
        )}

        <div className="map-zoom" role="group" aria-label="Масштаб">
          <button onClick={() => zoomAt(1 / ZOOM_STEP)} aria-label="Приблизить" title="Приблизить">
            +
          </button>
          <button onClick={() => zoomAt(ZOOM_STEP)} aria-label="Отдалить" title="Отдалить">
            −
          </button>
          <button
            className="map-zoom-fit"
            onClick={() => contentBounds && setBox(contentBounds)}
            aria-label="Показать целиком"
            title="Показать целиком"
          >
            ⤢
          </button>
        </div>

        {info && (
          <MapInfoCard
            target={info}
            mode={mode}
            byId={byId}
            model={collector}
            city={city}
            cityTraces={cityTraces}
            works={worksAll}
            onClose={() => setInfo(null)}
            onOpenCollector={openCollector}
            onSelect={select}
            onShowOnMap={showOnMap}
          />
        )}
      </div>

      <div className="map-foot">
        {mode === 'schema' ? (
          <ul className="map-legend" aria-label="Подсистемы датчиков">
            {systems.map(system => (
              <li key={system.name}>
                <span className="map-sys-icon" style={{ background: system.color }} aria-hidden="true">
                  {system.letter}
                </span>
                {system.name}
              </li>
            ))}
            <li>
              <span className="map-link-icon" aria-hidden="true" />
              связь с пикетом
            </li>
          </ul>
        ) : (
          <ul className="map-legend" aria-label="Состояние объектов">
            {markerStateOrder.map(state => (
              <li key={state}>
                <LegendMarker state={state} />
                {markerStateLabels[state]}
              </li>
            ))}
            <li>
              <span className="map-dash-icon" aria-hidden="true" />
              коридор коллектора
            </li>
            {mode === 'object' && (
              <>
                <li>
                  <svg className="map-legend-icon" viewBox="-12 -12 24 24" aria-hidden="true">
                    <EntranceGlyph />
                  </svg>
                  вход
                </li>
                <li>
                  <svg className="map-legend-icon" viewBox="-12 -12 24 24" aria-hidden="true">
                    <BaseGlyph />
                  </svg>
                  диспетчерский пункт
                </li>
              </>
            )}
          </ul>
        )}
        <span className="map-scale">{scaleLabel(unit)}</span>
      </div>
    </div>
  );
}

function scaleLabel(unit: number): string {
  const meters = unit * 100;
  return meters >= 1000 ? `100 px ≈ ${(meters / 1000).toFixed(1)} км` : `100 px ≈ ${Math.round(meters)} м`;
}

function visible([x, y]: Pt, view: Box, pad = 0): boolean {
  return x >= view.x - pad && x <= view.x + view.w + pad && y >= view.y - pad && y <= view.y + view.h + pad;
}

// ---------------------------------------------------------------- карта объекта

interface ObjectOverlayProps {
  collectorId: number | null;
  model: CollectorModel;
  cityTraces: CityTrace[];
  byId: Map<number, MonitoredObject>;
  works: Set<number>;
  unit: number;
  view: Box;
  selectedId: number | null;
  info: InfoTarget | null;
  onCollector: (id: number) => void;
  onObject: (id: number) => void;
  onInfo: (target: InfoTarget) => void;
}

function ObjectOverlay({
  collectorId,
  model,
  cityTraces,
  byId,
  works,
  unit,
  view,
  selectedId,
  info,
  onCollector,
  onObject,
  onInfo,
}: ObjectOverlayProps) {
  const collector = collectorId !== null ? byId.get(collectorId) : undefined;
  const corridorD = model.corridors.map(corridor => linePath(corridor.points)).join('');
  const traceD = model.corridors
    .filter(corridor => corridor.kind === 'trace')
    .map(corridor => linePath(corridor.points))
    .join('');
  const branchD = model.corridors
    .filter(corridor => corridor.kind === 'branch')
    .map(corridor => linePath(corridor.points))
    .join('');

  // шаг подписей пикетов — чтобы подписи не налезали друг на друга
  const spacing =
    model.pickets.length > 1
      ? Math.max(
          1,
          Math.hypot(model.pickets[1].at[0] - model.pickets[0].at[0], model.pickets[1].at[1] - model.pickets[0].at[1])
        )
      : 10;
  const every = niceStep(Math.ceil((70 * unit) / spacing));
  // ДП в одном здании (этажи) стоят в одной точке — разносим значки в ряд
  const baseSlot = new Map<number, number>();
  model.parts
    .filter(part => part.role === 'base')
    .forEach((part, index, bases) => {
      const same = bases
        .slice(0, index)
        .filter(other => Math.hypot(other.at[0] - part.at[0], other.at[1] - part.at[1]) < 1).length;
      baseSlot.set(part.id, same);
    });

  const bandParts = model.parts
    .filter(part => part.line)
    .sort((a, b) => (a.role === 'trace_guard' ? 0 : 1) - (b.role === 'trace_guard' ? 0 : 1));

  return (
    <g className="map-object-overlay">
      {cityTraces
        .filter(trace => trace.id !== collectorId)
        .map(trace => {
          const d = trace.lines.map(linePath).join('');
          return (
            <g key={trace.id} className="map-context map-clickable" onClick={() => onCollector(trace.id)}>
              <path className="map-hit" d={d} strokeWidth={14 * unit} />
              <path
                className="map-context-line"
                d={d}
                strokeWidth={2.2 * unit}
                strokeDasharray={`${7 * unit} ${6 * unit}`}
              />
              <title>{byId.get(trace.id)?.name ?? trace.name}</title>
            </g>
          );
        })}

      {/* участки коллектора — полосы цветом состояния под пунктиром коридора */}
      {bandParts.map(part => {
        const object = byId.get(part.id);
        const d = linePath(part.line!);
        const selected = selectedId === part.id || (info?.type === 'object' && info.id === part.id);
        return (
          <g
            key={part.id}
            className={`map-part map-part-${part.role} st-${object?.status ?? 'offline'} map-clickable${selected ? ' map-selected' : ''}`}
            onClick={() => onObject(part.id)}
          >
            <path className="map-hit" d={d} strokeWidth={18 * unit} />
            <path className="map-part-band" d={d} strokeWidth={(part.role === 'trace_guard' ? 20 : 12) * unit} />
            <title>{part.name}</title>
          </g>
        );
      })}

      <path className="map-corridor-halo" d={corridorD} strokeWidth={7 * unit} />
      <path
        className={`map-corridor st-${collector?.status ?? 'normal'}`}
        d={traceD}
        strokeWidth={3.4 * unit}
        strokeDasharray={`${10 * unit} ${6 * unit}`}
      />
      <path
        className="map-corridor map-corridor-branch"
        d={branchD}
        strokeWidth={2.6 * unit}
        strokeDasharray={`${6 * unit} ${5 * unit}`}
      />

      {unit <= 1.4 && (
        <g className="map-pickets">
          {model.pickets.map((picket, index) =>
            visible(picket.at, view, 20) ? (
              <circle
                key={picket.id}
                cx={picket.at[0]}
                cy={picket.at[1]}
                r={(index % every === 0 ? 2.4 : 1.4) * unit}
              />
            ) : null
          )}
          <g className="map-picket-labels" fontSize={9.5 * unit} strokeWidth={2.6 * unit}>
            {model.pickets.map((picket, index) =>
              index % every === 0 && visible(picket.at, view, 20) ? (
                <text key={picket.id} x={picket.at[0] + 5 * unit} y={picket.at[1] - 5 * unit}>
                  {picket.short}
                </text>
              ) : null
            )}
          </g>
        </g>
      )}

      {unit <= 0.5 && (
        <g className="map-sensor-dots">
          {model.sensors.map(sensor =>
            visible(sensor.at, view, 10) ? (
              <circle
                key={sensor.id}
                className="map-clickable"
                cx={sensor.at[0]}
                cy={sensor.at[1]}
                r={3.2 * unit}
                fill={(systemByName.get(sensor.system) ?? fallbackSystem).color}
                onClick={() => onInfo({ type: 'sensor', id: sensor.id })}
              >
                <title>{sensor.name}</title>
              </circle>
            ) : null
          )}
        </g>
      )}

      {unit <= 6 &&
        model.entrances.map(entrance => (
          <g
            key={entrance.picketId}
            className={`map-entrance map-clickable${info?.type === 'entrance' && info.picketId === entrance.picketId ? ' map-selected' : ''}`}
            transform={`translate(${entrance.at[0]} ${entrance.at[1]}) scale(${unit})`}
            onClick={() => onInfo({ type: 'entrance', picketId: entrance.picketId })}
          >
            <EntranceGlyph />
            {unit <= 1.6 && (
              <text className="map-entrance-label" x="11" dy="0.35em">
                Вход {entrance.code.slice(entrance.code.lastIndexOf('ПК'))}
              </text>
            )}
            <title>Вход в коллектор · {entrance.code}</title>
          </g>
        ))}

      {model.parts.map(part => {
        const object = byId.get(part.id);
        const state = markerState(object, works);
        const selected = selectedId === part.id;
        if (part.role === 'base') {
          const slot = baseSlot.get(part.id) ?? 0;
          return (
            <g
              key={part.id}
              className={`map-clickable${selected ? ' map-selected' : ''}`}
              transform={`translate(${part.at[0] + slot * 30 * unit} ${part.at[1]}) scale(${unit})`}
              onClick={() => onObject(part.id)}
            >
              <BaseGlyph />
              <StateBadge state={state} />
              {unit <= 2.5 && (
                <text className="map-part-label" y={22 + slot * 12}>
                  {part.name}
                </text>
              )}
              <title>
                {part.name} — {markerStateLabels[state]}
              </title>
            </g>
          );
        }
        if (part.role === 'cabinet' || !part.line) {
          return (
            <g
              key={part.id}
              className={`map-cabinet st-${object?.status ?? 'offline'} map-clickable${selected ? ' map-selected' : ''}`}
              transform={`translate(${part.at[0]} ${part.at[1]}) scale(${unit})`}
              onClick={() => onObject(part.id)}
            >
              <CabinetGlyph />
              <title>{part.name}</title>
            </g>
          );
        }
        const at = midpoint(part.line);
        const offset = part.role === 'trace_guard' ? 26 : 0;
        return (
          <g key={part.id}>
            <StatusMarker
              x={at[0]}
              y={at[1] - offset * unit}
              unit={unit}
              state={state}
              size={part.role === 'trace_guard' ? 0.85 : 1}
              selected={selected}
              title={`${part.name} — ${markerStateLabels[state]}`}
              onClick={() => onObject(part.id)}
            />
            {unit <= 3 && (
              <text
                className="map-label"
                x={at[0]}
                y={at[1] - offset * unit + 24 * unit}
                fontSize={10.5 * unit}
                strokeWidth={3 * unit}
              >
                {part.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------- схема

interface SchemaOverlayProps {
  schema: SchemaModel;
  model: CollectorModel;
  byId: Map<number, MonitoredObject>;
  works: Set<number>;
  unit: number;
  view: Box;
  info: InfoTarget | null;
  onObject: (id: number) => void;
  onInfo: (target: InfoTarget) => void;
}

function SchemaOverlay({ schema, model, byId, works, unit, view, info, onObject, onInfo }: SchemaOverlayProps) {
  const corridorLines = useMemo(() => schema.corridors.map(corridor => corridor.points), [schema.corridors]);

  // участок на схеме — рамка от первого до последнего его датчика
  const bands = useMemo(() => {
    const ranges = new Map<number, { x0: number; x1: number; y0: number; y1: number }>();
    for (const sensor of schema.sensors) {
      const objectId = model.sensorById.get(sensor.id)?.objectId;
      if (objectId === null || objectId === undefined) {
        continue;
      }
      const range = ranges.get(objectId);
      const [x, y] = sensor.at;
      if (range) {
        range.x0 = Math.min(range.x0, x);
        range.x1 = Math.max(range.x1, x);
        range.y0 = Math.min(range.y0, y);
        range.y1 = Math.max(range.y1, y);
      } else {
        ranges.set(objectId, { x0: x, x1: x, y0: y, y1: y });
      }
    }
    return Array.from(ranges.entries()).sort((a, b) => b[1].x1 - b[1].x0 - (a[1].x1 - a[1].x0));
  }, [schema.sensors, model.sensorById]);

  // связь датчика с его пикетом (или ближайшей точкой коридора)
  const links = useMemo(
    () =>
      schema.sensors.map(sensor => {
        const picketId = model.sensorById.get(sensor.id)?.picketId ?? null;
        const target =
          (picketId !== null ? schema.picketAt.get(picketId) : undefined) ??
          nearestOnLines(sensor.at, corridorLines);
        return { id: sensor.id, from: sensor.at, to: target };
      }),
    [schema, model.sensorById, corridorLines]
  );

  const spacing =
    schema.pickets.length > 1 ? Math.max(1, Math.abs(schema.pickets[1].at[0] - schema.pickets[0].at[0])) : 10;
  const every = niceStep(Math.ceil((64 * unit) / spacing));
  const detailed = unit <= 2.2;

  return (
    <g className="map-schema">
      {bands.map(([objectId, range], index) => {
        const object = byId.get(objectId);
        const state = markerState(object, works);
        const pad = 10 * unit;
        // подпись — над своей рамкой; соседние рамки разводим по высоте
        const labelY = range.y0 - pad - (12 + (index % 3) * 18) * unit;
        const selected = info?.type === 'object' && info.id === objectId;
        return (
          <g
            key={objectId}
            className={`map-schema-band st-${object?.status ?? 'offline'} map-clickable${selected ? ' map-selected' : ''}`}
            onClick={() => onObject(objectId)}
          >
            <rect
              x={range.x0 - pad}
              y={range.y0 - pad}
              width={range.x1 - range.x0 + pad * 2}
              height={range.y1 - range.y0 + pad * 2}
              rx={6 * unit}
              strokeWidth={1.2 * unit}
            />
            <g className={`ms-${state}`} transform={`translate(${range.x0} ${labelY}) scale(${unit})`}>
              <circle className="map-marker-disc" r="7" />
              <text className="map-schema-band-label" x="12" dy="0.35em">
                {object?.name ?? `Объект ${objectId}`} · {markerStateLabels[state]}
              </text>
            </g>
            <title>{object?.name}</title>
          </g>
        );
      })}

      <g className="map-schema-links" strokeWidth={unit}>
        {links.map(link =>
          link.to && visible(link.from, view, 60) ? <path key={link.id} d={linePath([link.from, link.to])} /> : null
        )}
      </g>

      {schema.corridors.map((corridor, index) => {
        const end = corridor.points[corridor.points.length - 1];
        return (
          <g key={index} className={`map-schema-corridor map-schema-${corridor.kind}`}>
            <path d={linePath(corridor.points)} strokeWidth={(corridor.kind === 'trace' ? 5 : 3.5) * unit} />
            <text x={end[0] + 8 * unit} y={end[1]} dy="0.35em" fontSize={11 * unit}>
              {corridor.name}
            </text>
          </g>
        );
      })}

      <g className="map-schema-pickets" strokeWidth={1.2 * unit}>
        {schema.pickets.map((picket, index) => {
          const labelled = index % every === 0;
          if (!visible(picket.at, view, 30) || (!labelled && !detailed)) {
            return null;
          }
          const [x, y] = picket.at;
          const tick = (labelled ? 7 : 4) * unit;
          return (
            <g key={picket.id}>
              <path d={`M${x} ${y - tick}V${y + tick}`} />
              {labelled && (
                <text x={x} y={y + 18 * unit} fontSize={9.5 * unit}>
                  {picket.short}
                </text>
              )}
            </g>
          );
        })}
      </g>

      <g className="map-schema-sensors">
        {schema.sensors.map(sensor => {
          if (!visible(sensor.at, view, 20)) {
            return null;
          }
          const system = systemByName.get(sensor.system) ?? fallbackSystem;
          const selected = info?.type === 'sensor' && info.id === sensor.id;
          const name = model.sensorById.get(sensor.id)?.name ?? sensor.system;
          return (
            <g
              key={sensor.id}
              className={`map-schema-sensor map-clickable${selected ? ' map-selected' : ''}`}
              transform={`translate(${sensor.at[0]} ${sensor.at[1]}) scale(${unit})`}
              onClick={() => onInfo({ type: 'sensor', id: sensor.id })}
            >
              {selected && <circle className="map-marker-ring" r="11" />}
              <circle r={detailed ? 7 : 4} fill={system.color} />
              {detailed && <text dy="0.35em">{system.letter}</text>}
              <title>{name}</title>
            </g>
          );
        })}
      </g>
    </g>
  );
}
