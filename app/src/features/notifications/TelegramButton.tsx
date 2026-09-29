import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { TelegramIcon } from '../../shared/ui/icons';
import SendTelegramModal from './SendTelegramModal';

// Рядом с конвертом письма и под тем же правом: «рассылать» — одно право на
// оба канала.
export default function TelegramButton() {
  const canSend = usePermission('notifications', 'create');
  const [open, setOpen] = useState(false);

  if (!canSend) {
    return null;
  }

  return (
    <>
      <button
        className="mail-btn"
        onClick={() => setOpen(true)}
        title="Отправить в Telegram"
        aria-label="Отправить в Telegram"
      >
        <TelegramIcon />
      </button>

      {open && <SendTelegramModal onClose={() => setOpen(false)} />}
    </>
  );
}
