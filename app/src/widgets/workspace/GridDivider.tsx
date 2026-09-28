import { PointerEvent, useRef } from 'react';

import { DIVIDER_SIZE, MIN_TRACK_SIZE } from '../../core/workspace/gridConfig';
import { useGridStore } from '../../stores/workspace/gridStore';

interface GridDividerProps {
  axis: 'column' | 'row';
  firstId: string;
  secondId: string;
  line: number;
  span: number;
}

interface DragStart {
  pointer: number;
  firstPx: number;
  pairPx: number;
  pxPerFr: number;
}

// Разделитель между соседними дорожками: делит их общий размер, сумма пары
// не меняется, остальные дорожки стоят на месте. Размеры в сторе — доли (fr),
// пиксели нужны только на время перетаскивания.
export default function GridDivider({ axis, firstId, secondId, line, span }: GridDividerProps) {
  const resizeTracks = useGridStore(state => state.resizeTracks);
  const dragStart = useRef<DragStart | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const canvas = event.currentTarget.parentElement;
    const { grid } = useGridStore.getState();
    const tracks = axis === 'column' ? grid.columns : grid.rows;
    const first = tracks.find(track => track.id === firstId);
    const second = tracks.find(track => track.id === secondId);
    if (!canvas || !first || !second) {
      return;
    }

    const style = getComputedStyle(canvas);
    const padding =
      axis === 'column'
        ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const extent = axis === 'column' ? canvas.clientWidth : canvas.clientHeight;
    const available = extent - padding - DIVIDER_SIZE * (tracks.length - 1);
    const totalFr = tracks.reduce((sum, track) => sum + track.size, 0);
    const pxPerFr = available / totalFr;

    dragStart.current = {
      pointer: axis === 'column' ? event.clientX : event.clientY,
      firstPx: first.size * pxPerFr,
      pairPx: (first.size + second.size) * pxPerFr,
      pxPerFr,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) {
      return;
    }

    const delta = (axis === 'column' ? event.clientX : event.clientY) - start.pointer;
    const min = Math.min(MIN_TRACK_SIZE, start.pairPx / 2);
    const firstPx = Math.min(Math.max(start.firstPx + delta, min), start.pairPx - min);
    resizeTracks(axis, firstId, secondId, firstPx / start.pxPerFr, (start.pairPx - firstPx) / start.pxPerFr);
  }

  function stopDrag() {
    dragStart.current = null;
  }

  const style =
    axis === 'column'
      ? { gridColumn: `${line} / span 1`, gridRow: `1 / span ${span}` }
      : { gridRow: `${line} / span 1`, gridColumn: `1 / span ${span}` };

  return (
    <div
      className={`grid-divider grid-divider-${axis === 'column' ? 'col' : 'row'}`}
      style={style}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    />
  );
}
