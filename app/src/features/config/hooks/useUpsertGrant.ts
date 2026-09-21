import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { grantRepository } from '../../../entities/grant/grantRepository';
import { CreateGrantRequest, Grant } from '../../../entities/grant/types';

export function useUpsertGrant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function upsertGrant(request: CreateGrantRequest): Promise<Grant | null> {
    setLoading(true);
    setError('');

    try {
      return await grantRepository.upsert(request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить права.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { upsertGrant, loading, error };
}
