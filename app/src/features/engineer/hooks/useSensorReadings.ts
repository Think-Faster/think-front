import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { readingRepository } from '../../../entities/reading/readingRepository';
import { Reading } from '../../../entities/reading/types';

// Журнал воронки отдаёт показания объекта за сутки, отбора по датчику в нём
// нет — берём наибольшую страницу и оставляем нужный канал.
const LOG_LIMIT = 1000;

export function useSensorReadings(objectId: number | undefined, sensorId: number) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (objectId === undefined) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    readingRepository
      .getLog({ objectId, limit: LOG_LIMIT })
      .then(page => {
        if (!cancelled) {
          setReadings(page.items.filter(reading => reading.sensorId === sensorId));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setReadings([]);
          setError(formatBffErrorMessage(err, 'Не удалось загрузить показания.'));
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
  }, [objectId, sensorId, nonce]);

  const reload = useCallback(() => setNonce(value => value + 1), []);

  return { readings, loading, error, reload };
}
