import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { MailIcon } from '../../shared/ui/icons';
import SendEmailModal from './SendEmailModal';

export default function MailButton() {
  const canSend = usePermission('notifications', 'create');
  const [open, setOpen] = useState(false);

  if (!canSend) {
    return null;
  }

  return (
    <>
      <button className="mail-btn" onClick={() => setOpen(true)} title="Отправить письмо" aria-label="Отправить письмо">
        <MailIcon />
      </button>

      {open && <SendEmailModal onClose={() => setOpen(false)} />}
    </>
  );
}
