import { PointerEvent, useEffect, useRef, useState } from 'react';

import { BffErrorCode } from '../../core/errors/bffError';
import { isWindowVisible, WindowDefinition, windowRegistry } from '../../core/registry/windowRegistry';
import { SEGMENT_OPTIONS } from '../../core/workspace/gridConfig';
import UserMenu from '../../features/auth/UserMenu';
import { CurtainIcon, LogoMark, MinusCircleIcon, PlusCircleIcon, TrashIcon } from '../../shared/ui/icons';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useFreeStore } from '../../stores/workspace/freeStore';
import { orderedWindowIds, segmentCount, useGridStore } from '../../stores/workspace/gridStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import {
  closeWindow,
  isWindowOpen,
  openWindow,
  restoreWindow,
  setOverlap,
  setSegments,
  useOpenWindowIds,
} from '../../stores/workspace/workspaceCommands';
import {
  cancelDrag,
  DragSession,
  finishFreeSidebarDrop,
  finishGridDrop,
  registerTrash,
  startDragSession,
  updateDragSession,
} from './trashZone';

// Клик по разделу: закрытый — открыть; свёрнутый — развернуть; в свободном
// режиме перекрытый — поднять наверх; открытый и видимый — закрыть.
// Раздел-действие («Создать заявку») не закрывается кликом — у него нет
// состояния «выбрано».
function activateSection(definition: WindowDefinition) {
  const { id } = definition;
  if (!isWindowOpen(id)) {
    openWindow(id);
    return;
  }

  const layout = useLayoutStore.getState();
  if (layout.minimized.includes(id)) {
    restoreWindow(id);
    return;
  }

  if (layout.overlap) {
    const { order } = useFreeStore.getState().free;
    if (order[order.length - 1] !== id) {
      useFreeStore.getState().focus(id);
      return;
    }
  }

  if (!definition.action) {
    closeWindow(id);
  }
}

interface SectionButtonProps {
  definition: WindowDefinition;
  selected: boolean;
  compact?: boolean;
}

// Раздел можно не только нажать, но и перетащить: в сетке — на ячейку
// (окно встаёт туда, стоявшее закрывается), на свободном холсте — в точку,
// где окно должно открыться.
function SectionButton({ definition, selected, compact = false }: SectionButtonProps) {
  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);

  function handleDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    sessionRef.current = startDragSession(definition.id, definition.title, 'sidebar', event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMove(event: PointerEvent<HTMLButtonElement>) {
    if (sessionRef.current) {
      updateDragSession(sessionRef.current, event.clientX, event.clientY, true);
    }
  }

  function handleUp(event: PointerEvent<HTMLButtonElement>) {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session?.moved) {
      return;
    }
    suppressClickRef.current = true;
    if (useLayoutStore.getState().overlap) {
      finishFreeSidebarDrop(session, event.clientX, event.clientY);
    } else if (!finishGridDrop(session, event.clientX, event.clientY)) {
      cancelDrag();
    }
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    activateSection(definition);
  }

  const classes = ['side-btn', compact ? 'compact' : '', selected ? 'on' : ''].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      aria-pressed={definition.action ? undefined : selected}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => {
        sessionRef.current = null;
        cancelDrag();
      }}
      onClick={handleClick}
    >
      <span className="side-btn-text">{definition.title}</span>
    </button>
  );
}

// «⊖ N ⊕» — число ячеек сегментной сетки (4/6/8/10, §7.1). Уменьшить нельзя,
// пока открытые окна не поместятся в меньшую сетку.
function SegmentStepper({ hidden }: { hidden: boolean }) {
  const grid = useGridStore(state => state.grid);
  const count = segmentCount(grid);
  const placed = orderedWindowIds(grid).length;

  const index = SEGMENT_OPTIONS.findIndex(option => option === count);
  const previous = index > 0 ? SEGMENT_OPTIONS[index - 1] : undefined;
  const next = index >= 0 && index < SEGMENT_OPTIONS.length - 1 ? SEGMENT_OPTIONS[index + 1] : undefined;
  const canDecrease = previous !== undefined && placed <= previous;

  let decreaseTitle = 'Меньше ячеек';
  if (previous === undefined) {
    decreaseTitle = `Меньше ${count} ячеек нельзя`;
  } else if (!canDecrease) {
    decreaseTitle = `Закройте окна: в ${previous} ячеек поместятся не все`;
  }

  return (
    <div className={`stepper ${hidden ? 'is-hidden' : ''}`} aria-hidden={hidden}>
      <button
        className="stepper-btn"
        disabled={!canDecrease}
        onClick={() => previous !== undefined && setSegments(previous)}
        title={decreaseTitle}
        aria-label="Меньше ячеек"
        tabIndex={hidden ? -1 : undefined}
      >
        <MinusCircleIcon />
      </button>
      <span className="stepper-value" aria-live="polite">
        {count}
      </span>
      <button
        className="stepper-btn"
        disabled={next === undefined}
        onClick={() => next !== undefined && setSegments(next)}
        title={next === undefined ? `Больше ${count} ячеек нельзя` : 'Больше ячеек'}
        aria-label="Больше ячеек"
        tabIndex={hidden ? -1 : undefined}
      >
        <PlusCircleIcon />
      </button>
    </div>
  );
}

function TrashZone() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useLayoutStore(state => state.drag);

  useEffect(() => {
    registerTrash(ref.current);
    return () => registerTrash(null);
  }, []);

  const armed = drag?.source === 'window';
  const over = armed && drag.overTrash;

  return (
    <div
      ref={ref}
      className={['trash', armed ? 'armed' : '', over ? 'over' : ''].filter(Boolean).join(' ')}
      title="Перетащите окно сюда, чтобы закрыть его"
    >
      <TrashIcon className="trash-icon" />
      {!over && <span className="trash-text">Удалить окно</span>}
    </div>
  );
}

// Почему прав нет: BFF отвечает 403 с кодом, текст ошибки у него английский.
function permissionsErrorText(code: BffErrorCode | null): string {
  switch (code) {
    case 'user_not_provisioned':
      return 'Учётная запись ещё не заведена в системе, поэтому разделов нет. Её добавляет администратор.';
    case 'user_inactive':
      return 'Учётная запись отключена. Обратитесь к администратору.';
    default:
      return 'Не удалось загрузить права, поэтому разделы скрыты.';
  }
}

export default function WorkspaceSidebar() {
  const collapsed = useLayoutStore(state => state.sidebarCollapsed);
  const toggleSidebar = useLayoutStore(state => state.toggleSidebar);
  const overlap = useLayoutStore(state => state.overlap);
  const hint = useLayoutStore(state => state.hint);
  const setHint = useLayoutStore(state => state.setHint);
  const permissions = usePermissionsStore(state => state.map);
  const permissionsStatus = usePermissionsStore(state => state.status);
  const permissionsError = usePermissionsStore(state => state.errorCode);
  const reloadPermissions = usePermissionsStore(state => state.load);
  const openIds = useOpenWindowIds();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!hint) {
      return;
    }
    const timer = window.setTimeout(() => setHint(null), 6000);
    return () => window.clearTimeout(timer);
  }, [hint, setHint]);

  if (collapsed) {
    return (
      <aside className="sidebar collapsed">
        <button className="sidebar-orb" onClick={toggleSidebar} title="Развернуть панель" aria-label="Развернуть панель" />
      </aside>
    );
  }

  const visible = windowRegistry.filter(
    definition => definition.section !== 'detail' && isWindowVisible(definition, permissions)
  );
  const primary = visible.filter(definition => definition.section === 'primary');
  const more = visible.filter(definition => definition.section === 'more');

  function isSelected(definition: WindowDefinition): boolean {
    return !definition.action && openIds.includes(definition.id);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <LogoMark className="sidebar-logo" />
        <button className="sidebar-curtain" onClick={toggleSidebar} title="Свернуть панель" aria-label="Свернуть панель">
          <CurtainIcon />
        </button>
      </div>

      <div className="sidebar-scroll">
        <nav className="sidebar-nav" aria-label="Разделы">
          {primary.map(definition => (
            <SectionButton key={definition.id} definition={definition} selected={isSelected(definition)} />
          ))}
        </nav>

        {visible.length === 0 && permissionsStatus === 'loading' && (
          <p className="sidebar-empty" role="status">
            Загружаем разделы…
          </p>
        )}

        {visible.length === 0 && permissionsStatus === 'ready' && (
          <p className="sidebar-empty" role="status">
            Нет доступных разделов: у учётной записи пока нет прав. Их выдаёт администратор.
          </p>
        )}

        {visible.length === 0 && permissionsStatus === 'error' && (
          <div className="sidebar-empty" role="alert">
            <p>{permissionsErrorText(permissionsError)}</p>
            <button className="sidebar-empty-retry" onClick={() => reloadPermissions()}>
              Повторить
            </button>
          </div>
        )}

        {more.length > 0 && (
          <div className="sidebar-more">
            <button className="sidebar-more-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen(value => !value)}>
              Ещё разделы <span aria-hidden="true">{moreOpen ? '▴' : '▾'}</span>
            </button>

            {moreOpen && (
              <div className="sidebar-nav">
                {more.map(definition => (
                  <SectionButton key={definition.id} definition={definition} selected={isSelected(definition)} compact />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <span className="overlap-label" id="overlap-label">
          Располагать окна внахлест?
        </span>

        <button
          className={`overlap-switch ${overlap ? 'yes' : 'no'}`}
          role="switch"
          aria-checked={overlap}
          aria-labelledby="overlap-label"
          onClick={() => setOverlap(!overlap)}
        >
          <span className="overlap-knob">{overlap ? 'Да' : 'Нет'}</span>
        </button>

        <SegmentStepper hidden={overlap} />

        <div className="sidebar-gap">
          {hint && (
            <div className="sidebar-hint" role="status">
              {hint}
            </div>
          )}
        </div>

        <TrashZone />

        <div className="sidebar-user">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
