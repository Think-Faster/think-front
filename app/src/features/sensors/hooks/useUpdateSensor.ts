import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { Sensor, UpdateSensorRequest } from '../../../entities/sensor/types';

export function useUpdateSensor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function updateSensor(id: number, request: UpdateSensorRequest): Promise<Sensor | null> {
    setLoading(true);
    setError('');

    try {
      return await sensorRepository.update(id, request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить датчик.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { updateSensor, loading, error };
}
