import {
  ReactNode,
  useRef,
  useState,
} from 'react';

import {
  useWindowManager,
  WindowState,
} from './WindowManager';

interface Props {
  window: WindowState;
  children: ReactNode;
}

export default function FloatingWindow({
  window,
  children,
}: Props) {
  const {
    focusWindow,
    updateWindow,
  } = useWindowManager();

  const [dragging, setDragging] =
    useState(false);

  const dragStart =
    useRef({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
    });

  const resizeStart =
    useRef({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

  function startDrag(
    event: React.PointerEvent
  ) {
    if (
      (event.target as HTMLElement)
        .closest('button')
    ) {
      return;
    }

    focusWindow(window.id);

    setDragging(true);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: window.x,
      top: window.y,
    };

    (
      event.currentTarget as HTMLElement
    ).setPointerCapture(
      event.pointerId
    );
  }

  function moveDrag(
    event: React.PointerEvent
  ) {
    if (!dragging) {
      return;
    }

    const dx =
      event.clientX -
      dragStart.current.x;

    const dy =
      event.clientY -
      dragStart.current.y;

    updateWindow(window.id, {
      x: Math.max(
        0,
        dragStart.current.left + dx
      ),
      y: Math.max(
        0,
        dragStart.current.top + dy
      ),
    });
  }

  function stopDrag() {
    setDragging(false);
  }

  function startResize(
    event: React.PointerEvent
  ) {
    event.stopPropagation();

    focusWindow(window.id);

    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: window.width,
      height: window.height,
    };

    (
      event.currentTarget as HTMLElement
    ).setPointerCapture(
      event.pointerId
    );
  }

  function resize(
    event: React.PointerEvent
  ) {
    if (
      resizeStart.current.width === 0
    ) {
      return;
    }

    const dx =
      event.clientX -
      resizeStart.current.x;

    const dy =
      event.clientY -
      resizeStart.current.y;

    updateWindow(window.id, {
      width: Math.max(
        260,
        resizeStart.current.width + dx
      ),
      height: Math.max(
        160,
        resizeStart.current.height + dy
      ),
    });
  }

  function stopResize() {
    resizeStart.current = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  if (!window.open) {
    return null;
  }

  return (
    <section
      className="win"
      style={{
        left: window.x,
        top: window.y,
        width: window.width,
        height: window.height,
        zIndex: window.z,
      }}
      onPointerDown={() =>
        focusWindow(window.id)
      }
    >

      <div
        className="win-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
      >
        <span className="win-title">
          {window.title}
        </span>

        <button
          className="win-close"
          onClick={() =>
            updateWindow(
              window.id,
              { open: false }
            )
          }
        >
          ×
        </button>
      </div>

      <div className="win-body">
        {children}
      </div>

      <div
        className="win-resize"
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
      />

    </section>
  )}