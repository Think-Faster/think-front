import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';
import { CreateObjectRequest, MonitoredObject } from '../../../entities/object/types';

export function useCreateObject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createObject(request: CreateObjectRequest): Promise<MonitoredObject | null> {
    setLoading(true);
    setError('');

    try {
      return await objectRepository.create(request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось создать объект.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createObject, loading, error };
}
