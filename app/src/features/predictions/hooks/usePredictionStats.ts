import { useCallback, useEffect, useState } from 'react';

import { useDataEvent } from '../../../core/events/dataEvents';
import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { modelControlRepository } from '../../../entities/modelControl/modelControlRepository';
import { ModelLastTick } from '../../../entities/modelControl/types';
import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { PredictionStats } from '../../../entities/prediction/types';

// Сводка журнала (BFF) и последний такт модели для сверки. Такт модели — по той же куке входа;
// не отдала (модель недоступна) — сводка показывается без сверки.
export function usePredictionStats() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [lastTick, setLastTick] = useState<ModelLastTick | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');

    predictionRepository
      .getStats()
      .then(setStats)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить сводку прогнозов.')));

    modelControlRepository
      .getStatus()
      .then(status => setLastTick(status.lastTick))
      .catch(() => setLastTick(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useDataEvent('prediction.updated', load);

  return { stats, lastTick, error, reload: load };
}
