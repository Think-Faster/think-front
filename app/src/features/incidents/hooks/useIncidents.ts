import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { incidentRepository } from '../../../entities/incident/incidentRepository';
import { Incident } from '../../../entities/incident/types';

export function useIncidents() {
  const [objectId, setObjectId] = useState<number | undefined>(undefined);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    incidentRepository
      .getList({ objectId })
      .then(result => setIncidents(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить происшествия.')))
      .finally(() => setLoading(false));
  }, [objectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { incidents, loading, error, objectId, setObjectId, reload };
}
