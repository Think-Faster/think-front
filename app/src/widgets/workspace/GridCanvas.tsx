import { CSSProperties, PointerEvent, useRef } from 'react';

import { WindowDefinition } from '../../core/registry/windowRegistry';
import { DIVIDER_SIZE, MIN_TRACK_SIZE } from '../../core/workspace/gridConfig';
import Window from '../../shared/ui/Window';
import { useGridStore } from '../../stores/workspace/gridStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { closeWindow, minimizeWindow, restoreWindow } from '../../stores/workspace/workspaceCommands';
import GridDivider from './GridDivider';
import { cancelDrag, DragSession, finishGridDrop, startDragSession, updateDragSession } from './trashZone';
import WindowContent, { useVisibleDefinition, useWindowContext } from './WindowContent';

// Дорожка i живёт на линии 2i+1, разделитель между i и i+1 — на линии 2i+2
// (между каждой парой дорожек стоит дорожка-разделитель DIVIDER_SIZE).
function trackLine(index: number): number {
  return index * 2 + 1;
}

interface SlotProps {
  windowId: string;
  columnId: string;
  rowId: string;
  style: CSSProperties;
}

function GridSlot({ windowId, columnId, rowId, style }: SlotProps) {
  const definition = useVisibleDefinition(windowId);
  const minimized = useLayoutStore(state => state.minimized.includes(windowId));

  if (!definition) {
    return null;
  }

  return (
    <div className="grid-slot" data-cell="" data-column-id={columnId} data-row-id={rowId} style={style}>
      {minimized ? <MinimizedCell definition={definition} /> : <GridWindow definition={definition} />}
    </div>
  );
}

function MinimizedCell({ definition }: { definition: WindowDefinition }) {
  const context = useWindowContext(definition.id);
  return (
    <div className="cell-minimized">
      <button className="min-strip" onClick={() => restoreWindow(definition.id)} title="Развернуть">
        <span className="min-title">{definition.title}</span>
        {context && <span className="min-ctx">{context}</span>}
      </button>
    </div>
  );
}

function GridWindow({ definition }: { definition: WindowDefinition }) {
  const drag = useLayoutStore(state => (state.drag?.windowId === definition.id ? state.drag : null));
  const reload = useLayoutStore(state => state.reload);
  const sessionRef = useRef<DragSession | null>(null);

  function handleDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    sessionRef.current = startDragSession(definition.id, definition.title, 'window', event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (sessionRef.current) {
      updateDragSession(sessionRef.current, event.clientX, event.clientY, true);
    }
  }

  function handleUp(event: PointerEvent<HTMLDivElement>) {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session?.moved) {
      return;
    }
    if (!finishGridDrop(session, event.clientX, event.clientY)) {
      cancelDrag();
    }
  }

  const classes = [drag ? 'dragging' : '', drag?.overTrash ? 'to-trash' : ''].filter(Boolean).join(' ');

  return (
    <Window
      windowId={definition.id}
      title={definition.title}
      className={classes}
      onClose={() => closeWindow(definition.id)}
      onMinimize={() => minimizeWindow(definition.id)}
      onReload={() => reload(definition.id)}
      onHeadPointerDown={handleDown}
      onHeadPointerMove={handleMove}
      onHeadPointerUp={handleUp}
    >
      <WindowContent definition={definition} />
    </Window>
  );
}

// Сегментный режим (§7.3): матрица одинаковых ячеек; окно тянут за шапку на
// другую ячейку — окна меняются местами; разделители двигают границу между
// соседними дорожками.
export default function GridCanvas() {
  const grid = useGridStore(state => state.grid);
  const { columns, rows, cells } = grid;

  const columnSpan = Math.max(1, columns.length * 2 - 1);
  const rowSpan = Math.max(1, rows.length * 2 - 1);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: columns
      .map(column => `minmax(${MIN_TRACK_SIZE}px, ${column.size}fr)`)
      .join(` ${DIVIDER_SIZE}px `),
    gridTemplateRows: rows.map(row => `minmax(${MIN_TRACK_SIZE}px, ${row.size}fr)`).join(` ${DIVIDER_SIZE}px `),
  };

  function areaStyle(columnId: string, rowId: string): CSSProperties {
    const columnIndex = columns.findIndex(column => column.id === columnId);
    const rowIndex = rows.findIndex(row => row.id === rowId);
    return {
      gridColumn: `${trackLine(columnIndex)} / span 1`,
      gridRow: `${trackLine(rowIndex)} / span 1`,
    };
  }

  return (
    <div className="grid-canvas" style={gridStyle}>
      {cells.map(cell => (
        <div
          key={`${cell.columnId}:${cell.rowId}`}
          className="grid-cell"
          data-cell=""
          data-column-id={cell.columnId}
          data-row-id={cell.rowId}
          style={areaStyle(cell.columnId, cell.rowId)}
        >
          {!cell.windowId && <span className="grid-cell-hint">Перетащите раздел сюда</span>}
        </div>
      ))}

      {cells
        .filter(cell => cell.windowId)
        .map(cell => (
          <GridSlot
            key={cell.windowId}
            windowId={cell.windowId as string}
            columnId={cell.columnId}
            rowId={cell.rowId}
            style={areaStyle(cell.columnId, cell.rowId)}
          />
        ))}

      {columns.slice(0, -1).map((column, index) => (
        <GridDivider
          key={column.id}
          axis="column"
          firstId={column.id}
          secondId={columns[index + 1].id}
          line={trackLine(index) + 1}
          span={rowSpan}
        />
      ))}

      {rows.slice(0, -1).map((row, index) => (
        <GridDivider
          key={row.id}
          axis="row"
          firstId={row.id}
          secondId={rows[index + 1].id}
          line={trackLine(index) + 1}
          span={columnSpan}
        />
      ))}
    </div>
  );
}
