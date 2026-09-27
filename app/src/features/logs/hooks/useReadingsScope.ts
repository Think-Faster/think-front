import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { readingRepository } from '../../../entities/reading/readingRepository';
import { ReadingsScope } from '../../../entities/reading/types';

// Что пользователю можно смотреть в «Логах»: все объекты (readings:read) или
// объекты его заявок в работе — список для выбора объекта в окне.
export function useReadingsScope() {
  const [scope, setScope] = useState<ReadingsScope | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    readingRepository
      .getScope()
      .then(result => {
        if (!cancelled) {
          setScope(result);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatBffErrorMessage(err, 'Не удалось узнать, какие объекты вам доступны.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { scope, error };
}
