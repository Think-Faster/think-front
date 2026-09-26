import { PointerEvent, useRef } from 'react';

import { useGridStore } from '../../stores/workspace/gridStore';

interface GridColumnDividerProps {
  columnId: string;
  lineIndex: number;
  rowSpan: number;
}

// Тащит только трек СЛЕВА от разделителя (не split двух соседей пополам) —
// .workspace уже скроллится (overflow: auto), так что растущий справа
// сосед не требует отдельной обработки.
export default function GridColumnDivider({ columnId, lineIndex, rowSpan }: GridColumnDividerProps) {
  const columns = useGridStore(state => state.grid.columns);
  const resizeColumn = useGridStore(state => state.resizeColumn);
  const dragStart = useRef<{ x: number; size: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const column = columns.find(item => item.id === columnId);
    if (!column) {
      return;
    }

    dragStart.current = { x: event.clientX, size: column.size };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) {
      return;
    }

    resizeColumn(columnId, dragStart.current.size + (event.clientX - dragStart.current.x));
  }

  function stopDrag() {
    dragStart.current = null;
  }

  return (
    <div
      className="grid-divider grid-divider-col"
      style={{ gridColumn: `${lineIndex} / span 1`, gridRow: `1 / span ${rowSpan}` }}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
    />
  );
}
