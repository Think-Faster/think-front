import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';
import { MonitoredObject, UpdateObjectRequest } from '../../../entities/object/types';

export function useUpdateObject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function updateObject(id: number, request: UpdateObjectRequest): Promise<MonitoredObject | null> {
    setLoading(true);
    setError('');

    try {
      return await objectRepository.update(id, request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить объект.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { updateObject, loading, error };
}
