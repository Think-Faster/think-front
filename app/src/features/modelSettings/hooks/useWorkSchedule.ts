import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { WorkScheduleEntry } from '../../../entities/workSchedule/types';
import { workScheduleRepository } from '../../../entities/workSchedule/workScheduleRepository';

// from — начало периода (ISO); без него BFF отдаёт весь график.
export function useWorkSchedule(from?: string) {
  const [works, setWorks] = useState<WorkScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    workScheduleRepository
      .getList(from ? { from } : {})
      .then(items => {
        if (!cancelled) {
          setWorks(items);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatBffErrorMessage(err, 'Не удалось загрузить график работ.'));
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
  }, [from]);

  return { works, loading, error };
}
