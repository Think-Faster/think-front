import { PointerEvent, ReactNode, useRef, useState } from 'react';

interface WindowProps {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minWidth?: number;
  minHeight?: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onClose: () => void;
  children: ReactNode;
}

export default function Window({
  title,
  x,
  y,
  width,
  height,
  zIndex,
  minWidth = 260,
  minHeight = 160,
  onFocus,
  onMove,
  onResize,
  onClose,
  children,
}: WindowProps) {
  const [dragging, setDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  function startDrag(event: PointerEvent) {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    onFocus();
    setDragging(true);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: x,
      top: y,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (!dragging) {
      return;
    }

    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;

    onMove(
      Math.max(0, dragStart.current.left + dx),
      Math.max(0, dragStart.current.top + dy)
    );
  }

  function stopDrag() {
    setDragging(false);
  }

  function startResize(event: PointerEvent) {
    event.stopPropagation();
    onFocus();

    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width,
      height,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function resize(event: PointerEvent) {
    if (resizeStart.current.width === 0) {
      return;
    }

    const dx = event.clientX - resizeStart.current.x;
    const dy = event.clientY - resizeStart.current.y;

    onResize(
      Math.max(minWidth, resizeStart.current.width + dx),
      Math.max(minHeight, resizeStart.current.height + dy)
    );
  }

  function stopResize() {
    resizeStart.current = { x: 0, y: 0, width: 0, height: 0 };
  }

  return (
    <section
      className="win"
      style={{ left: x, top: y, width, height, zIndex }}
      onPointerDown={onFocus}
    >
      <div
        className="win-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
      >
        <span className="win-title">{title}</span>

        <button className="win-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="win-body">{children}</div>

      <div
        className="win-resize"
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
      />
    </section>
  );
}
