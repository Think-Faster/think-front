import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { ignoredRangeRepository } from '../../../entities/ignoredRange/ignoredRangeRepository';
import { CreateIgnoredRangeRequest, IgnoredRange } from '../../../entities/ignoredRange/types';

export function useIgnoredRanges() {
  const [ranges, setRanges] = useState<IgnoredRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    ignoredRangeRepository
      .getList()
      .then(setRanges)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить игнорируемые диапазоны.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createRange(request: CreateIgnoredRangeRequest): Promise<boolean> {
    setActing(true);
    setActionError('');

    try {
      await ignoredRangeRepository.create(request);
      reload();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось создать диапазон.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function removeRange(id: string): Promise<boolean> {
    setActing(true);
    setActionError('');

    try {
      await ignoredRangeRepository.remove(id);
      reload();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось удалить диапазон.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  return { ranges, loading, error, createRange, removeRange, acting, actionError };
}
