import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { grantRepository } from '../../../entities/grant/grantRepository';
import { Grant } from '../../../entities/grant/types';

export function useGrants() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    grantRepository
      .getList()
      .then(setGrants)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить права.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { grants, loading, error, reload };
}
