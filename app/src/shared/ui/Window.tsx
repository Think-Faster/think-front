import { ReactNode } from 'react';

interface WindowProps {
  windowId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Плитка в сетке workspace — больше не сама себя позиционирует/ресайзит
// (это раньше делали onMove/onResize с pointer-capture); её размер и место
// целиком определяет родительская grid-клетка, см.
// widgets/workspace/WorkspaceCanvas.tsx. data-window-id — хук для
// hit-теста при drag-and-drop оверрайде из сайдбара (см.
// widgets/workspace/WorkspaceSidebar.tsx): элемент под курсором находится
// через document.elementFromPoint(...).closest('[data-window-id]'), без
// отдельного реестра ref-ов между сайдбаром и канвасом.
export default function Window({ windowId, title, onClose, children }: WindowProps) {
  return (
    <section className="win" data-window-id={windowId}>
      <div className="win-head">
        <span className="win-title">{title}</span>

        <button className="win-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="win-body">{children}</div>
    </section>
  );
}
