import { CSSProperties, PointerEvent, ReactNode } from 'react';

import { CloseIcon, DuplicateIcon, MinimizeIcon, ReloadIcon } from './icons';

interface WindowProps {
  windowId: string;
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  onReload?: () => void;
  // Ещё одно окно того же раздела с тем же объектом (есть у разделов,
  // которые можно держать открытыми в нескольких экземплярах).
  onDuplicate?: () => void;
  // Перетаскивание за шапку: в свободном режиме двигает окно, в сегментном —
  // несёт призрак к ячейке или мусорке (см. widgets/workspace/trashZone.ts).
  onHeadPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onHeadPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onHeadPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDownCapture?: () => void;
  className?: string;
  style?: CSSProperties;
  // Ручка ресайза в правом нижнем углу (только свободный режим).
  resizeHandle?: ReactNode;
  children: ReactNode;
}

// Шапка по макету: градиент, белый заголовок, справа ⧉ ↻ – ×. Кнопки шапки
// гасят pointerdown, чтобы клик по ним не начинал перетаскивание окна.
// data-window-id — метка окна для hit-теста при броске.
export default function Window({
  windowId,
  title,
  onClose,
  onMinimize,
  onReload,
  onDuplicate,
  onHeadPointerDown,
  onHeadPointerMove,
  onHeadPointerUp,
  onPointerDownCapture,
  className = '',
  style,
  resizeHandle,
  children,
}: WindowProps) {
  function stop(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <section
      className={`win ${className}`.trim()}
      data-window-id={windowId}
      style={style}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div
        className="win-head"
        onPointerDown={onHeadPointerDown}
        onPointerMove={onHeadPointerMove}
        onPointerUp={onHeadPointerUp}
      >
        <span className="win-title">{title}</span>

        <div className="win-actions">
          {onDuplicate && (
            <button
              className="win-btn"
              onPointerDown={stop}
              onClick={onDuplicate}
              title="Открыть ещё одно такое окно"
              aria-label="Открыть ещё одно такое окно"
            >
              <DuplicateIcon />
            </button>
          )}
          {onReload && (
            <button className="win-btn" onPointerDown={stop} onClick={onReload} title="Обновить" aria-label="Обновить">
              <ReloadIcon />
            </button>
          )}
          {onMinimize && (
            <button className="win-btn" onPointerDown={stop} onClick={onMinimize} title="Свернуть" aria-label="Свернуть">
              <MinimizeIcon />
            </button>
          )}
          <button className="win-btn win-close" onPointerDown={stop} onClick={onClose} title="Закрыть" aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="win-body">{children}</div>

      {resizeHandle}
    </section>
  );
}
