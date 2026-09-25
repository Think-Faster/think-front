import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { incidentRepository } from '../../../entities/incident/incidentRepository';
import { ConfirmIncidentRequest, Incident } from '../../../entities/incident/types';

export function useConfirmIncident() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  async function confirmIncident(id: string, request: ConfirmIncidentRequest): Promise<Incident | null> {
    setConfirming(true);
    setError('');

    try {
      return await incidentRepository.confirm(id, request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось подтвердить происшествие.'));
      return null;
    } finally {
      setConfirming(false);
    }
  }

  return { confirmIncident, confirming, error };
}
