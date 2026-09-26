import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { resourceRepository } from '../../../entities/resource/resourceRepository';
import { Resource } from '../../../entities/resource/types';

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    resourceRepository
      .getList()
      .then(setResources)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить сущности.')))
      .finally(() => setLoading(false));
  }, []);

  return { resources, loading, error };
}
