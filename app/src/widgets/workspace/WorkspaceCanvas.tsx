import { CSSProperties } from 'react';

import { isWindowVisible, windowRegistry } from '../../core/registry/windowRegistry';
import { ADD_TRACK_SIZE, DIVIDER_SIZE } from '../../core/workspace/gridConfig';
import Window from '../../shared/ui/Window';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useGridStore } from '../../stores/workspace/gridStore';
import GridColumnDivider from './GridColumnDivider';
import GridRowDivider from './GridRowDivider';

// Реальный трек i живёт на линии 2i+1, разделитель между i и i+1 — на 2i+2
// (1-based CSS grid line numbers, между каждой парой реальных треков —
// трек-разделитель, см. core/workspace/gridConfig.ts DIVIDER_SIZE).
function trackLine(index: number): number {
  return index * 2 + 1;
}

export default function WorkspaceCanvas() {
  const grid = useGridStore(state => state.grid);
  const removeWindow = useGridStore(state => state.removeWindow);
  const addColumn = useGridStore(state => state.addColumn);
  const addRow = useGridStore(state => state.addRow);
  const permissions = usePermissionsStore(state => state.map);

  const { columns, rows, cells } = grid;

  const columnTrackSpan = Math.max(1, columns.length * 2 - 1);
  const rowTrackSpan = Math.max(1, rows.length * 2 - 1);

  const templateColumns = columns.map(column => `${column.size}px`).join(` ${DIVIDER_SIZE}px `);
  const templateRows = rows.map(row => `${row.size}px`).join(` ${DIVIDER_SIZE}px `);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `${templateColumns} ${ADD_TRACK_SIZE}px`.trim(),
    gridTemplateRows: `${templateRows} ${ADD_TRACK_SIZE}px`.trim(),
  };

  return (
    <div className="grid-canvas" style={gridStyle}>
      {cells
        .filter(cell => cell.windowId)
        .map(cell => {
          const definition = windowRegistry.find(item => item.id === cell.windowId);
          if (!definition || !isWindowVisible(definition, permissions)) {
            return null;
          }

          const columnIndex = columns.findIndex(column => column.id === cell.columnId);
          const rowIndex = rows.findIndex(row => row.id === cell.rowId);
          const Content = definition.component;

          return (
            <div
              key={definition.id}
              style={{
                gridColumn: `${trackLine(columnIndex)} / span 1`,
                gridRow: `${trackLine(rowIndex)} / span 1`,
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <Window windowId={definition.id} title={definition.title} onClose={() => removeWindow(definition.id)}>
                <Content />
              </Window>
            </div>
          );
        })}

      {columns.slice(0, -1).map((column, index) => (
        <GridColumnDivider
          key={column.id}
          columnId={column.id}
          lineIndex={trackLine(index) + 1}
          rowSpan={rowTrackSpan}
        />
      ))}

      {rows.slice(0, -1).map((row, index) => (
        <GridRowDivider key={row.id} rowId={row.id} lineIndex={trackLine(index) + 1} columnSpan={columnTrackSpan} />
      ))}

      <button
        className="grid-add-col"
        style={{ gridColumn: `${columnTrackSpan + 1} / span 1`, gridRow: `1 / span ${rowTrackSpan}` }}
        onClick={() => addColumn()}
        title="Добавить колонку"
      >
        +
      </button>

      <button
        className="grid-add-row"
        style={{ gridRow: `${rowTrackSpan + 1} / span 1`, gridColumn: `1 / span ${columnTrackSpan}` }}
        onClick={() => addRow()}
        title="Добавить строку"
      >
        +
      </button>
    </div>
  );
}
