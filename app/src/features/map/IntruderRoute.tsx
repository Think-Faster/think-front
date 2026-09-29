import { FactAlert } from '../../entities/factAlert/types';
import { factSensorLabel } from '../predictions/predictionLabels';
import { linePath, Pt } from './geo';

// Короче этого (в экранных пикселях) у отрезка стрелку не рисуем — не поместится.
const ARROW_MIN_PX = 36;
// Время у точек подписываем только вблизи, иначе подписи налезают друг на друга.
const TIME_MAX_UNIT = 1.5;
// Номера нескольких заходов в одну точку — через точку, больше — диапазоном.
const MAX_LISTED_VISITS = 3;

interface IntruderRouteProps {
  // Эпизод проникновения. Идёт (live) — последняя точка пульсирует, прошедший — пунктиром.
  alert: FactAlert;
  objectName: string;
  // Где датчик на текущем виде карты: на карте объекта и на схеме позиции разные.
  position: (sensorId: number) => Pt | null;
  unit: number;
  onSensor?: (sensorId: number) => void;
}

function hhmm(at: string): string {
  return new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function visitsLabel(numbers: number[]): string {
  return numbers.length <= MAX_LISTED_VISITS
    ? numbers.join('·')
    : `${numbers[0]}…${numbers[numbers.length - 1]}`;
}

// Маршрут нарушителя (ML/INTEGRATION.md §13.11): сработки охраны по времени —
// ломаная по датчикам, стрелки по ходу движения, номера заходов у точек.
// Датчики, которых нет в слое карты, пропускаются.
export default function IntruderRoute({ alert, objectName, position, unit, onSensor }: IntruderRouteProps) {
  const live = alert.live;
  // Имя и пикет из справочника (sensors эпизода), без него — тип и номер из маршрута.
  const stopLabel = (sensorId: number, sType: string | null) => {
    const sensor = alert.sensors.find(item => item.sensorId === sensorId);
    return sensor?.name ? factSensorLabel(sensor) : `${sType ?? 'Датчик'} №${sensorId}`;
  };
  const title = `Маршрут нарушителя · ${objectName} · с ${hhmm(alert.startedAt)}${live ? ', идёт' : ''}`;
  const points = alert.route.flatMap((point, index) => {
    const pos = position(point.sensorId);
    return pos ? [{ ...point, pos, number: index + 1 }] : [];
  });
  if (points.length === 0) {
    return null;
  }

  const stops = new Map<number, typeof points>();
  points.forEach(point => stops.set(point.sensorId, [...(stops.get(point.sensorId) ?? []), point]));
  const last = points[points.length - 1];

  const arrows = points.slice(1).flatMap((point, k) => {
    const from = points[k].pos;
    const dx = point.pos[0] - from[0];
    const dy = point.pos[1] - from[1];
    if (Math.hypot(dx, dy) < ARROW_MIN_PX * unit) {
      return [];
    }
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return [{ key: k, x: from[0] + dx / 2, y: from[1] + dy / 2, angle }];
  });

  const d = linePath(points.map(point => point.pos));
  return (
    <g className={`map-route${live ? ' map-route-live' : ' map-route-past'}`}>
      <title>{title}</title>
      <path className="map-route-halo" d={d} strokeWidth={7 * unit} />
      <path
        className="map-route-line"
        d={d}
        strokeWidth={3 * unit}
        strokeDasharray={live ? undefined : `${8 * unit} ${5 * unit}`}
      />
      {arrows.map(arrow => (
        <path
          key={arrow.key}
          className="map-route-arrow"
          d="M-5 -4.5L5 0L-5 4.5Z"
          transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle}) scale(${unit})`}
        />
      ))}
      {Array.from(stops.values()).map(visits => {
        const [x, y] = visits[0].pos;
        const isLast = visits[visits.length - 1] === last;
        return (
          <g
            key={visits[0].sensorId}
            className={`map-route-stop${onSensor ? ' map-clickable' : ''}`}
            transform={`translate(${x} ${y}) scale(${unit})`}
            onClick={onSensor ? () => onSensor(visits[0].sensorId) : undefined}
          >
            {isLast && live && <circle className="map-route-pulse" r="9" />}
            <circle r={isLast ? 10 : 8} />
            <text dy="0.35em">{visitsLabel(visits.map(visit => visit.number))}</text>
            {unit <= TIME_MAX_UNIT && (
              <text className="map-route-time" x="13" y="-9">
                {hhmm(visits[visits.length - 1].at)}
              </text>
            )}
            <title>
              {visits.map(visit => `${visit.number}. ${stopLabel(visit.sensorId, visit.sType)} — ${hhmm(visit.at)}`).join('\n')}
            </title>
          </g>
        );
      })}
    </g>
  );
}
