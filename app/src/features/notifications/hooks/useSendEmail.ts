import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { notificationRepository } from '../../../entities/notification/notificationRepository';
import { SendEmailRequest, SendEmailResponse } from '../../../entities/notification/types';

export function useSendEmail() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SendEmailResponse | null>(null);

  async function sendEmail(request: SendEmailRequest): Promise<boolean> {
    setSending(true);
    setError('');

    try {
      const response = await notificationRepository.sendEmail(request);
      setResult(response);
      return true;
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось отправить письмо.'));
      return false;
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
  }

  return { sendEmail, sending, error, result, reset };
}
