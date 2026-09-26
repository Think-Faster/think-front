import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { retrainJobRepository } from '../../../entities/retrainJob/retrainJobRepository';
import { CreateRetrainJobRequest, RetrainJob } from '../../../entities/retrainJob/types';

export function useRetrainJobs() {
  const [jobs, setJobs] = useState<RetrainJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    retrainJobRepository
      .getList()
      .then(setJobs)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить заявки на переобучение.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createJob(request: CreateRetrainJobRequest): Promise<boolean> {
    setCreating(true);
    setCreateError('');

    try {
      await retrainJobRepository.create(request);
      reload();
      return true;
    } catch (err) {
      setCreateError(formatBffErrorMessage(err, 'Не удалось создать заявку на переобучение.'));
      return false;
    } finally {
      setCreating(false);
    }
  }

  return { jobs, loading, error, createJob, creating, createError };
}
