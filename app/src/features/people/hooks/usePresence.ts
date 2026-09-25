import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { presenceRepository } from '../../../entities/presence/presenceRepository';
import { Presence } from '../../../entities/presence/types';

export function usePresence(userId: string | undefined) {
  const [presence, setPresence] = useState<Presence | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setPresence(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    presenceRepository
      .getList([userId])
      .then(result => {
        if (!cancelled) {
          setPresence(result.find(item => item.userId === userId));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatBffErrorMessage(err, 'Не удалось загрузить присутствие.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { presence, loading, error };
}
