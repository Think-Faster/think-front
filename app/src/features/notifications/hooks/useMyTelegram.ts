import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { userRepository } from '../../../entities/user/userRepository';
import { TelegramStatus } from '../../../entities/user/types';

// Своё имя в Telegram и подключён ли бот — грузится при открытии профиля:
// «Старт» человек нажимает в Telegram, поэтому статус берём свежим.
export function useMyTelegram(active: boolean) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    userRepository
      .getMyTelegram()
      .then(value => !cancelled && setStatus(value))
      .catch(() => !cancelled && setStatus(null));

    return () => {
      cancelled = true;
    };
  }, [active]);

  async function save(username: string): Promise<boolean> {
    setSaving(true);
    setError('');

    try {
      setStatus(await userRepository.updateMyTelegram(username));
      return true;
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить Telegram.'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { status, saving, error, save };
}
