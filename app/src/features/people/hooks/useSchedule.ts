import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { scheduleRepository } from '../../../entities/schedule/scheduleRepository';
import { ScheduleEntry } from '../../../entities/schedule/types';

export function useSchedule(userId: string | undefined) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    scheduleRepository
      .getList(userId)
      .then(setEntries)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить график.')))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, loading, error, reload };
}
