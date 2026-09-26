import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';
import { MonitoredObject } from '../../../entities/object/types';

export function useObjects() {
  const [objects, setObjects] = useState<MonitoredObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    objectRepository
      .getList()
      .then(result => setObjects(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить объекты.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { objects, loading, error, reload };
}
