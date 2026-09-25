import { PointerEvent, useRef, useState } from 'react';

import { isWindowVisible, windowRegistry } from '../../core/registry/windowRegistry';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useGridStore } from '../../stores/workspace/gridStore';

// Ниже этого сдвига — обычный клик (тоггл), выше — перетаскивание
// (оверрайд размещения). См. handlePointerUp.
const DRAG_THRESHOLD = 6;

// Курсор должен быть в крайних 25% ширины/высоты клетки, чтобы считаться
// над её правым/нижним краем — иначе «мёртвая зона» в середине, без
// однозначного намерения пользователя.
const EDGE_ZONE = 0.25;

type DropDirection = 'right' | 'bottom';

interface DropTarget {
  windowId: string;
  direction: DropDirection;
}

interface DragState {
  windowId: string;
  title: string;
  startX: number;
  startY: number;
  moved: boolean;
}

interface Ghost {
  title: string;
  x: number;
  y: number;
  droppable: boolean;
}

export default function WorkspaceSidebar() {
  const grid = useGridStore(state => state.grid);
  const placeWindowAuto = useGridStore(state => state.placeWindowAuto);
  const placeWindowAt = useGridStore(state => state.placeWindowAt);
  const removeWindow = useGridStore(state => state.removeWindow);
  const permissions = usePermissionsStore(state => state.map);

  const [ghost, setGhost] = useState<Ghost | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  function isPlaced(windowId: string): boolean {
    return grid.cells.some(cell => cell.windowId === windowId);
  }

  function clearHighlight() {
    if (highlightRef.current) {
      highlightRef.current.classList.remove('drop-target-right', 'drop-target-bottom');
      highlightRef.current = null;
    }
  }

  // Находит окно под курсором через data-window-id (см. shared/ui/Window.tsx)
  // и определяет, в какую четверть клетки попал курсор — заодно подсвечивает
  // целевой край как побочный эффект (без лишнего состояния в React).
  function hitTest(clientX: number, clientY: number): DropTarget | null {
    const el = document.elementFromPoint(clientX, clientY);
    const winEl = el?.closest('[data-window-id]') as HTMLElement | null;

    if (!winEl || !winEl.dataset.windowId) {
      clearHighlight();
      return null;
    }

    const rect = winEl.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    let direction: DropDirection | null = null;
    if (relX >= 1 - EDGE_ZONE) {
      direction = 'right';
    } else if (relY >= 1 - EDGE_ZONE) {
      direction = 'bottom';
    }

    if (!direction) {
      clearHighlight();
      return null;
    }

    if (highlightRef.current !== winEl) {
      clearHighlight();
    }

    winEl.classList.add(direction === 'right' ? 'drop-target-right' : 'drop-target-bottom');
    winEl.classList.remove(direction === 'right' ? 'drop-target-bottom' : 'drop-target-right');
    highlightRef.current = winEl;

    return { windowId: winEl.dataset.windowId, direction };
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, windowId: string, title: string) {
    dragRef.current = { windowId, title, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }

    drag.moved = true;

    const target = hitTest(event.clientX, event.clientY);
    setGhost({ title: drag.title, x: event.clientX, y: event.clientY, droppable: target !== null });
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>, windowId: string) {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || !drag.moved) {
      // просто клик — тоггл, как у старого win-chip
      if (isPlaced(windowId)) {
        removeWindow(windowId);
      } else {
        placeWindowAuto(windowId);
      }

      setGhost(null);
      clearHighlight();
      return;
    }

    const target = hitTest(event.clientX, event.clientY);

    if (target && target.windowId !== windowId) {
      placeWindowAt(windowId, target.windowId, target.direction);
    } else {
      placeWindowAuto(windowId);
    }

    setGhost(null);
    clearHighlight();
  }

  return (
    <nav className="sidebar">
      <span className="sidebar-label">Разделы</span>

      {windowRegistry.map(definition => {
        if (!isWindowVisible(definition, permissions)) {
          return null;
        }

        return (
          <button
            key={definition.id}
            className={`sidebar-item ${isPlaced(definition.id) ? 'on' : ''}`}
            onPointerDown={event => handlePointerDown(event, definition.id, definition.title)}
            onPointerMove={handlePointerMove}
            onPointerUp={event => handlePointerUp(event, definition.id)}
          >
            {definition.title}
          </button>
        );
      })}

      {ghost && (
        <div
          className={`sidebar-drag-ghost ${ghost.droppable ? 'droppable' : ''}`}
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.title}
        </div>
      )}
    </nav>
  );
}
