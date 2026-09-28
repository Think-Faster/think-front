import { ReactNode, useRef } from 'react';

import { useDismiss } from '../hooks/useDismiss';
import { CloseIcon } from './icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

// Поверх всех окон workspace, вне grid/free-раскладки — для разовых
// действий и форм редактирования, которым не нужно быть панелью, которую
// держат открытой и двигают по сетке (см. ARCHITECTURE.md «Email-рассылка»
// и «Панели редактирования — модалка вместо скролла»). Закрывается по
// клику вне себя или по Escape — тот же useDismiss, что и у
// .user-menu-popover.
export default function Modal({ title, onClose, footer, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useDismiss(modalRef, onClose, true);

  return (
    <div className="modal-backdrop">
      <div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>

          <button className="win-btn win-close" onClick={onClose} title="Закрыть" aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
