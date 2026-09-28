import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { Sensor } from '../../../entities/sensor/types';

// Датчики одного объекта — целиком (на коллекторе их бывает за двести, а
// страница BFF по умолчанию — 50); без объекта — первая страница.
const OBJECT_SENSORS_PAGE_SIZE = 1000;

export function useSensors(objectId?: number) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    sensorRepository
      .getList({ objectId, pageSize: objectId === undefined ? undefined : OBJECT_SENSORS_PAGE_SIZE })
      .then(result => setSensors(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить датчики.')))
      .finally(() => setLoading(false));
  }, [objectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sensors, loading, error, reload };
}
