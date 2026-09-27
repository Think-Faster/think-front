import { PointerEvent, useEffect, useRef } from 'react';

import { WindowDefinition } from '../../core/registry/windowRegistry';
import Window from '../../shared/ui/Window';
import { FreeRect, useFreeStore } from '../../stores/workspace/freeStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { closeWindow, minimizeWindow, restoreWindow } from '../../stores/workspace/workspaceCommands';
import { DragSession, isOverTrash, registerCanvas, startDragSession, updateDragSession } from './trashZone';
import WindowContent, { useVisibleDefinition, useWindowContext } from './WindowContent';

// Шапка должна оставаться досягаемой: окно нельзя увести выше холста или
// целиком за левый край.
const KEEP_VISIBLE = 80;

interface FreeWindowProps {
  definition: WindowDefinition;
  rect: FreeRect;
  zIndex: number;
}

function FreeWindow({ definition, rect, zIndex }: FreeWindowProps) {
  const move = useFreeStore(state => state.move);
  const resize = useFreeStore(state => state.resize);
  const focus = useFreeStore(state => state.focus);
  const reload = useLayoutStore(state => state.reload);
  const drag = useLayoutStore(state => (state.drag?.windowId === definition.id ? state.drag : null));

  const moveRef = useRef<{ session: DragSession; origin: FreeRect } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; origin: FreeRect } | null>(null);

  function handleHeadDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    moveRef.current = {
      session: startDragSession(definition.id, definition.title, 'window', event.clientX, event.clientY),
      origin: rect,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHeadMove(event: PointerEvent<HTMLDivElement>) {
    const current = moveRef.current;
    if (!current || !updateDragSession(current.session, event.clientX, event.clientY, false)) {
      return;
    }
    const x = current.origin.x + event.clientX - current.session.startX;
    const y = current.origin.y + event.clientY - current.session.startY;
    move(definition.id, Math.max(x, KEEP_VISIBLE - current.origin.width), Math.max(0, y));
  }

  function handleHeadUp(event: PointerEvent<HTMLDivElement>) {
    const current = moveRef.current;
    moveRef.current = null;
    if (!current?.session.moved) {
      return;
    }
    useLayoutStore.getState().setDrag(null);
    if (isOverTrash(event.clientX, event.clientY)) {
      closeWindow(definition.id);
    }
  }

  function handleResizeDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    resizeRef.current = { x: event.clientX, y: event.clientY, origin: rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeMove(event: PointerEvent<HTMLDivElement>) {
    const current = resizeRef.current;
    if (!current) {
      return;
    }
    resize(
      definition.id,
      current.origin.width + event.clientX - current.x,
      current.origin.height + event.clientY - current.y
    );
  }

  function handleResizeUp() {
    resizeRef.current = null;
  }

  const classes = ['win-free', drag ? 'dragging' : '', drag?.overTrash ? 'to-trash' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <Window
      windowId={definition.id}
      title={definition.title}
      className={classes}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex }}
      onPointerDownCapture={() => focus(definition.id)}
      onClose={() => closeWindow(definition.id)}
      onMinimize={() => minimizeWindow(definition.id)}
      onReload={() => reload(definition.id)}
      onHeadPointerDown={handleHeadDown}
      onHeadPointerMove={handleHeadMove}
      onHeadPointerUp={handleHeadUp}
      resizeHandle={
        <div
          className="win-resize"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          onPointerCancel={handleResizeUp}
        />
      }
    >
      <WindowContent definition={definition} />
    </Window>
  );
}

function FreeSlot({ windowId, zIndex }: { windowId: string; zIndex: number }) {
  const definition = useVisibleDefinition(windowId);
  const rect = useFreeStore(state => state.free.rects[windowId]);
  const minimized = useLayoutStore(state => state.minimized.includes(windowId));

  if (!definition || !rect || minimized) {
    return null;
  }
  return <FreeWindow definition={definition} rect={rect} zIndex={zIndex} />;
}

function MinimizedStrip({ windowId }: { windowId: string }) {
  const definition = useVisibleDefinition(windowId);
  const context = useWindowContext(windowId);
  if (!definition) {
    return null;
  }
  return (
    <div className="min-strip-row">
      <button className="min-strip" onClick={() => restoreWindow(windowId)} title="Развернуть">
        <span className="min-title">{definition.title}</span>
        {context && <span className="min-ctx">{context}</span>}
      </button>
      <button className="min-close" onClick={() => closeWindow(windowId)} title="Закрыть" aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}

// Свободный режим («внахлёст»): окна лежат друг на друге, последнее
// тронутое — сверху. Порядок в DOM стабильный (по id), глубину задаёт
// z-index — иначе перестановка узлов сбрасывала бы прокрутку окон.
export default function FreeCanvas() {
  const order = useFreeStore(state => state.free.order);
  const minimized = useLayoutStore(state => state.minimized);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerCanvas(canvasRef.current);
    return () => registerCanvas(null);
  }, []);

  const stable = [...order].sort();
  const tray = order.filter(id => minimized.includes(id));

  return (
    <div className="free-canvas" ref={canvasRef}>
      {stable.map(id => (
        <FreeSlot key={id} windowId={id} zIndex={order.indexOf(id) + 1} />
      ))}

      {tray.length > 0 && (
        <div className="min-tray">
          {tray.map(id => (
            <MinimizedStrip key={id} windowId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
