import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { modelVersionRepository } from '../../../entities/modelVersion/modelVersionRepository';
import { CreateModelVersionRequest, ModelVersion } from '../../../entities/modelVersion/types';

export function useModelVersions() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    modelVersionRepository
      .getList()
      .then(setVersions)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить версии модели.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createVersion(request: CreateModelVersionRequest): Promise<boolean> {
    setActing(true);
    setActionError('');

    try {
      await modelVersionRepository.create(request);
      reload();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось создать версию модели.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function activateVersion(id: string): Promise<boolean> {
    setActing(true);
    setActionError('');

    try {
      await modelVersionRepository.activate(id);
      reload();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось активировать версию модели.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  return { versions, loading, error, createVersion, activateVersion, acting, actionError };
}
