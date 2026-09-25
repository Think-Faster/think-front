import { PointerEvent, useRef } from 'react';

import { useGridStore } from '../../stores/workspace/gridStore';

interface GridRowDividerProps {
  rowId: string;
  lineIndex: number;
  columnSpan: number;
}

// Симметрично GridColumnDivider, только по вертикали — тащит трек НАД
// разделителем.
export default function GridRowDivider({ rowId, lineIndex, columnSpan }: GridRowDividerProps) {
  const rows = useGridStore(state => state.grid.rows);
  const resizeRow = useGridStore(state => state.resizeRow);
  const dragStart = useRef<{ y: number; size: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const row = rows.find(item => item.id === rowId);
    if (!row) {
      return;
    }

    dragStart.current = { y: event.clientY, size: row.size };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) {
      return;
    }

    resizeRow(rowId, dragStart.current.size + (event.clientY - dragStart.current.y));
  }

  function stopDrag() {
    dragStart.current = null;
  }

  return (
    <div
      className="grid-divider grid-divider-row"
      style={{ gridRow: `${lineIndex} / span 1`, gridColumn: `1 / span ${columnSpan}` }}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
    />
  );
}
