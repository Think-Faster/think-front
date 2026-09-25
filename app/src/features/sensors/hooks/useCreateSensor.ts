import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { CreateSensorRequest, Sensor } from '../../../entities/sensor/types';

export function useCreateSensor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createSensor(request: CreateSensorRequest): Promise<Sensor | null> {
    setLoading(true);
    setError('');

    try {
      return await sensorRepository.create(request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось создать датчик.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createSensor, loading, error };
}
