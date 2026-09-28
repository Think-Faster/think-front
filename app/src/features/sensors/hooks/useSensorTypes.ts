import { useEffect, useState } from 'react';

import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { SensorTypeOption } from '../../../entities/sensor/types';

// Подсистемы и типы, которые уже есть у датчиков. Если BFF ручки ещё не
// знает, форма остаётся со справочником подсистем и вводом своего типа.
export function useSensorTypes() {
  const [types, setTypes] = useState<SensorTypeOption[]>([]);

  useEffect(() => {
    sensorRepository
      .getTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
  }, []);

  return types;
}
