import { CSSProperties, PointerEvent, useEffect, useRef, useState } from 'react';

import { WindowDefinition, windowTitle } from '../../core/registry/windowRegistry';
import Window from '../../shared/ui/Window';
import { FreeRect, useFreeStore } from '../../stores/workspace/freeStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { closeWindow, minimizeWindow, restoreWindow } from '../../stores/workspace/workspaceCommands';
import { DragSession, isOverTrash, registerCanvas, startDragSession, trashRect, updateDragSession } from './trashZone';
import WindowContent, { useDuplicateWindow, useVisibleDefinition, useWindowContext } from './WindowContent';

// Шапка должна оставаться досягаемой: окно нельзя увести выше холста или
// целиком за левый край.
const KEEP_VISIBLE = 80;

// Какую долю мусорки занимает окно, сжатое над ней.
const TRASH_FIT = 0.8;

// Во сколько раз сжать окно, чтобы оно легло в мусорку.
function trashScale(rect: FreeRect): number {
  const trash = trashRect();
  return trash ? Math.min(trash.width / rect.width, trash.height / rect.height, 1) * TRASH_FIT : TRASH_FIT;
}

interface FreeWindowProps {
  windowId: string;
  definition: WindowDefinition;
  rect: FreeRect;
  zIndex: number;
}

function FreeWindow({ windowId, definition, rect, zIndex }: FreeWindowProps) {
  const move = useFreeStore(state => state.move);
  const resize = useFreeStore(state => state.resize);
  const focus = useFreeStore(state => state.focus);
  const reload = useLayoutStore(state => state.reload);
  const drag = useLayoutStore(state => (state.drag?.windowId === windowId ? state.drag : null));
  const title = windowTitle(definition, windowId);
  const duplicate = useDuplicateWindow(windowId, definition);

  const moveRef = useRef<{ session: DragSession; origin: FreeRect } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; origin: FreeRect } | null>(null);
  // Точка окна под курсором при захвате: к ней окно сжимается над мусоркой.
  const [grab, setGrab] = useState({ x: 0, y: 0 });

  function handleHeadDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    moveRef.current = {
      session: startDragSession(windowId, title, 'window', event.clientX, event.clientY),
      origin: rect,
    };
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box) {
      setGrab({ x: event.clientX - box.left, y: event.clientY - box.top });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHeadMove(event: PointerEvent<HTMLDivElement>) {
    const current = moveRef.current;
    if (!current || !updateDragSession(current.session, event.clientX, event.clientY, false)) {
      return;
    }
    const x = current.origin.x + event.clientX - current.session.startX;
    const y = current.origin.y + event.clientY - current.session.startY;
    move(windowId, Math.max(x, KEEP_VISIBLE - current.origin.width), Math.max(0, y));
  }

  function handleHeadUp(event: PointerEvent<HTMLDivElement>) {
    const current = moveRef.current;
    moveRef.current = null;
    if (!current?.session.moved) {
      return;
    }
    useLayoutStore.getState().setDrag(null);
    if (isOverTrash(event.clientX, event.clientY)) {
      closeWindow(windowId);
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
      windowId,
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

  // Пока окно тянут, оно поверх шторки (слой из CSS), иначе уходит под неё
  // по дороге к мусорке. Над мусоркой CSS сжимает окно до --trash-scale
  // вокруг точки захвата и ставит его центр под курсор.
  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: drag ? 'var(--z-window-dragged)' : zIndex,
    '--grab-x': `${grab.x}px`,
    '--grab-y': `${grab.y}px`,
    '--trash-scale': drag?.overTrash ? trashScale(rect) : 1,
  } as CSSProperties;

  return (
    <Window
      windowId={windowId}
      title={title}
      className={classes}
      style={style}
      onPointerDownCapture={() => focus(windowId)}
      onClose={() => closeWindow(windowId)}
      onMinimize={() => minimizeWindow(windowId)}
      onReload={() => reload(windowId)}
      onDuplicate={duplicate}
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
      <WindowContent windowId={windowId} definition={definition} />
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
  return <FreeWindow windowId={windowId} definition={definition} rect={rect} zIndex={zIndex} />;
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
        <span className="min-title">{windowTitle(definition, windowId)}</span>
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
