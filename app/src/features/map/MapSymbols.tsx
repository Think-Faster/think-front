import { MonitoredObject, ObjectStatus } from '../../entities/object/types';

// Значки карты. Рисуются в пикселях экрана: снаружи их масштабирует
// scale(unit), поэтому на любом зуме они одного размера. Состояние
// различается и цветом, и формой значка (TF-7: не только цветом).

export type MarkerState = ObjectStatus | 'works';

export const markerStateLabels: Record<MarkerState, string> = {
  normal: 'норма',
  watch: 'наблюдение',
  alarm: 'тревога',
  offline: 'нет данных',
  works: 'идут работы',
};

export const markerStateOrder: MarkerState[] = ['normal', 'watch', 'alarm', 'offline', 'works'];

export type MapMode = 'city' | 'object' | 'schema';

// Состояние значка: тревога важнее всего, дальше — идущие работы.
export function markerState(object: MonitoredObject | undefined, works: Set<number>): MarkerState {
  if (!object) {
    return 'offline';
  }
  if (object.status !== 'alarm' && works.has(object.id)) {
    return 'works';
  }
  return object.status;
}

const GEAR_TEETH = Array.from({ length: 8 }, (_, k) => {
  const angle = (k * Math.PI) / 4;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return `M${(4.6 * c).toFixed(2)} ${(4.6 * s).toFixed(2)}L${(7 * c).toFixed(2)} ${(7 * s).toFixed(2)}`;
}).join('');

export function MarkerGlyph({ state }: { state: MarkerState }) {
  switch (state) {
    case 'normal':
      return <path className="map-glyph" d="M-5 0.4L-1.6 3.8L5 -3.4" />;
    case 'watch':
      return (
        <text className="map-glyph-text" y="0.5" dy="0.35em">
          ?
        </text>
      );
    case 'alarm':
      return (
        <text className="map-glyph-text" y="0.5" dy="0.35em">
          !!
        </text>
      );
    case 'offline':
      return <path className="map-glyph" d="M-4.5 0H4.5" />;
    case 'works':
      return (
        <g className="map-glyph">
          <circle r="3.6" />
          <path d={GEAR_TEETH} />
        </g>
      );
  }
}

interface StatusMarkerProps {
  x: number;
  y: number;
  unit: number;
  state: MarkerState;
  selected?: boolean;
  size?: number;
  title?: string;
  onClick?: () => void;
}

// Круглый значок состояния объекта, как в макете: ✓ норма, ? наблюдение,
// !! тревога, — нет данных, шестерёнка — идут работы.
export function StatusMarker({ x, y, unit, state, selected, size = 1, title, onClick }: StatusMarkerProps) {
  return (
    <g
      className={`map-marker ms-${state}${selected ? ' map-marker-selected' : ''}${onClick ? ' map-clickable' : ''}`}
      transform={`translate(${x} ${y}) scale(${unit * size})`}
      onClick={onClick}
    >
      {selected && <circle className="map-marker-ring" r="16" />}
      <circle className="map-marker-disc" r="11" />
      <MarkerGlyph state={state} />
      {title && <title>{title}</title>}
    </g>
  );
}

// Легенда — те же значки, что на карте.
export function LegendMarker({ state }: { state: MarkerState }) {
  return (
    <svg className={`map-legend-icon ms-${state}`} viewBox="-12 -12 24 24" aria-hidden="true">
      <circle className="map-marker-disc" r="11" />
      <MarkerGlyph state={state} />
    </svg>
  );
}

// Вход в коллектор — люк: белый круг с решёткой.
export function EntranceGlyph() {
  return (
    <g className="map-entrance-glyph">
      <circle r="7.5" />
      <path d="M-4 -2.5H4M-4.6 0H4.6M-4 2.5H4" />
    </g>
  );
}

// Диспетчерский пункт — здание-ориентир с подписью «ДП».
export function BaseGlyph() {
  return (
    <g className="map-base-glyph">
      <rect x="-11" y="-9" width="22" height="18" rx="3" />
      <text dy="0.35em">ДП</text>
    </g>
  );
}

// Метка состояния в углу значка ДП: у диспетчерского пункта своё
// состояние, и тревога на нём не должна теряться.
export function StateBadge({ state }: { state: MarkerState }) {
  return (
    <g className={`map-state-badge ms-${state}`} transform="translate(11 -9) scale(0.55)">
      <circle className="map-marker-disc" r="11" />
      <MarkerGlyph state={state} />
    </g>
  );
}

// Шкаф/щит на трассе.
export function CabinetGlyph() {
  return (
    <g className="map-cabinet-glyph">
      <rect x="-6.5" y="-6.5" width="13" height="13" rx="2" />
      <path d="M0 -4V4" />
    </g>
  );
}

// Маршрут нарушителя — ломаная со стрелкой: метка у коллектора на карте
// района и значок в легенде.
export function RouteGlyph() {
  return <path className="map-glyph" d="M-5.5 4L-2 -1L1.5 2.5L5 -3.5M1.6 -3.6L5 -3.5L5.2 -0.2" />;
}

export function RouteBadge() {
  return (
    <g className="map-route-badge">
      <circle className="map-marker-disc" r="9" />
      <RouteGlyph />
    </g>
  );
}
