import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { notificationRepository } from '../../../entities/notification/notificationRepository';
import { SendTelegramRequest, SendTelegramResponse } from '../../../entities/notification/types';

export function useSendTelegram() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SendTelegramResponse | null>(null);

  async function sendTelegram(request: SendTelegramRequest): Promise<boolean> {
    setSending(true);
    setError('');

    try {
      const response = await notificationRepository.sendTelegram(request);
      setResult(response);
      return true;
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось отправить сообщение.'));
      return false;
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
  }

  return { sendTelegram, sending, error, result, reset };
}
