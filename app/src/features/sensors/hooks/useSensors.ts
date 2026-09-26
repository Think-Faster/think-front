import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { Sensor } from '../../../entities/sensor/types';

export function useSensors(objectId?: number) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    sensorRepository
      .getList({ objectId })
      .then(result => setSensors(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить датчики.')))
      .finally(() => setLoading(false));
  }, [objectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sensors, loading, error, reload };
}
