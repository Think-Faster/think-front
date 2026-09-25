import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { brigadeRepository } from '../../../entities/brigade/brigadeRepository';
import { Brigade, CreateBrigadeRequest } from '../../../entities/brigade/types';

export function useBrigades() {
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    brigadeRepository
      .getList()
      .then(setBrigades)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить бригады.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createBrigade(request: CreateBrigadeRequest): Promise<boolean> {
    setCreating(true);
    setCreateError('');

    try {
      await brigadeRepository.create(request);
      reload();
      return true;
    } catch (err) {
      setCreateError(formatBffErrorMessage(err, 'Не удалось создать бригаду.'));
      return false;
    } finally {
      setCreating(false);
    }
  }

  return { brigades, loading, error, createBrigade, creating, createError };
}
