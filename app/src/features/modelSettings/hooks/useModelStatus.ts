import { useCallback, useEffect, useRef, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { modelControlRepository } from '../../../entities/modelControl/modelControlRepository';
import { ModelStatus } from '../../../entities/modelControl/types';

// Команда уходит в модель через очередь: BFF отвечает 202 сразу, модель применяет её за секунды.
// Поэтому после отправки перечитываем /status, пока команда не видна (номер версии), но не дольше.
const POLL_MS = 2000;
const POLL_TRIES = 5;

// Отправить команду и дождаться, пока модель её применит; false — команда не ушла.
export type ModelCommandSender = (
  command: () => Promise<unknown>,
  applied: (next: ModelStatus) => boolean
) => Promise<boolean>;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const alive = useRef(true);

  const reload = useCallback(async (): Promise<ModelStatus | null> => {
    setError('');

    try {
      const next = await modelControlRepository.getStatus();
      if (alive.current) {
        setStatus(next);
      }
      return next;
    } catch (err) {
      if (alive.current) {
        setError(formatBffErrorMessage(err, 'Модель не отвечает: состояние не загружено.'));
      }
      return null;
    } finally {
      if (alive.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();

    return () => {
      alive.current = false;
    };
  }, [reload]);

  // applied — видна ли команда в новом состоянии (например, settings.version вырос).
  async function send(command: () => Promise<unknown>, applied: (next: ModelStatus) => boolean): Promise<boolean> {
    setActing(true);
    setActionError('');
    setNotice('');

    try {
      await command();
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Команда не отправлена.'));
      setActing(false);
      return false;
    }

    for (let i = 0; i < POLL_TRIES && alive.current; i += 1) {
      await wait(POLL_MS);
      const next = await reload();
      if (next && applied(next)) {
        setNotice('Модель применила изменение.');
        setActing(false);
        return true;
      }
    }

    setNotice('Команда отправлена, но модель её пока не применила. Если номер версии не сменится, модель отклонила снимок — причина в её журнале аудита.');
    setActing(false);
    return true;
  }

  return { status, loading, error, reload, send, acting, actionError, notice };
}
