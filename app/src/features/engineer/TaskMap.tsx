import { useMemo, useState } from 'react';

import { MinusCircleIcon, PlusCircleIcon } from '../../shared/ui/icons';
import { CollectorModel } from '../map/collector';
import { Box, boundsOf, linePath, Pt } from '../map/geo';

// Карта в карточке заявки: трасса коллектора, участок заявки и её датчики.
// Слои те же, что у окна «Карта» (features/map), но без выбора объектов и
// перетаскивания — на телефоне жест прокручивает страницу, масштаб кнопками.
type MapMode = 'place' | 'collector';

const modeLabels: Record<MapMode, string> = {
  place: 'Участок',
  collector: 'Коллектор',
};

const ZOOM_STEP = 1.5;
const MAX_ZOOM = 16;
// Участок из одной точки не раздуваем на весь экран: не меньше 80 м по стороне.
const MIN_PLACE_SIZE = 80;

interface TaskMapProps {
  model: CollectorModel;
  objectId: number;
  sensorIds: number[];
}

function atLeast(box: Box, size: number): Box {
  const w = Math.max(box.w, size);
  const h = Math.max(box.h, size);
  return { x: box.x - (w - box.w) / 2, y: box.y - (h - box.h) / 2, w, h };
}

export default function TaskMap({ model, objectId, sensorIds }: TaskMapProps) {
  const [mode, setMode] = useState<MapMode>('place');
  const [zoom, setZoom] = useState(1);

  const part = model.parts.find(item => item.id === objectId);
  const focus = useMemo(() => new Set(sensorIds), [sensorIds]);
  const taskSensors = model.sensors.filter(sensor => focus.has(sensor.id));

  const fit = useMemo(() => {
    const placePoints: Pt[][] = [
      ...(part ? [part.line ?? [part.at]] : []),
      ...taskSensors.map(sensor => [sensor.at]),
    ];
    const place = boundsOf(placePoints, 0.25);
    if (mode === 'place' && place) {
      return atLeast(place, MIN_PLACE_SIZE);
    }
    return model.bounds ?? place;
  }, [mode, part, taskSensors, model.bounds]);

  if (!fit) {
    return null;
  }

  const w = fit.w / zoom;
  const h = fit.h / zoom;
  const view = { x: fit.x + (fit.w - w) / 2, y: fit.y + (fit.h - h) / 2, w, h };
  const r = Math.max(view.w, view.h) * 0.018;

  function changeMode(next: MapMode) {
    setMode(next);
    setZoom(1);
  }

  return (
    <section className="eng-map" aria-label="Карта">
      <div className="eng-map-head">
        <span>Карта</span>
        <div className="eng-map-modes" role="group" aria-label="Что показать">
          {(Object.keys(modeLabels) as MapMode[]).map(item => (
            <button
              key={item}
              className={item === mode ? 'active' : ''}
              aria-pressed={item === mode}
              onClick={() => changeMode(item)}
            >
              {modeLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="eng-map-body">
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet">
          {model.corridors.map((corridor, index) => (
            <path
              key={index}
              className={`eng-map-corridor ${corridor.kind}`}
              d={linePath(corridor.points)}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {part?.line && (
            <path className="eng-map-part" d={linePath(part.line)} vectorEffect="non-scaling-stroke" />
          )}

          {model.pickets.map(picket => (
            <circle key={picket.id} className="eng-map-picket" cx={picket.at[0]} cy={picket.at[1]} r={r * 0.35} />
          ))}

          {mode === 'collector' &&
            model.sensors
              .filter(sensor => !focus.has(sensor.id))
              .map(sensor => (
                <circle key={sensor.id} className="eng-map-sensor" cx={sensor.at[0]} cy={sensor.at[1]} r={r * 0.3} />
              ))}

          {part && !part.line && (
            <circle className="eng-map-part-point" cx={part.at[0]} cy={part.at[1]} r={r * 1.4} vectorEffect="non-scaling-stroke" />
          )}

          {taskSensors.map(sensor => (
            <circle
              key={sensor.id}
              className="eng-map-sensor task"
              cx={sensor.at[0]}
              cy={sensor.at[1]}
              r={r}
              vectorEffect="non-scaling-stroke"
            >
              <title>{sensor.name}</title>
            </circle>
          ))}
        </svg>

        <div className="eng-map-zoom">
          <button
            aria-label="Приблизить"
            onClick={() => setZoom(value => Math.min(value * ZOOM_STEP, MAX_ZOOM))}
            disabled={zoom >= MAX_ZOOM}
          >
            <PlusCircleIcon />
          </button>
          <button
            aria-label="Отдалить"
            onClick={() => setZoom(value => Math.max(value / ZOOM_STEP, 1))}
            disabled={zoom <= 1}
          >
            <MinusCircleIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
