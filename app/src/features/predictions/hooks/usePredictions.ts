import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { PredictionListItem, PredictionStatus } from '../../../entities/prediction/types';

export function usePredictions() {
  const [status, setStatus] = useState<PredictionStatus | 'all'>('all');
  const [objectId, setObjectId] = useState<number | undefined>(undefined);
  const [predictions, setPredictions] = useState<PredictionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    predictionRepository
      .getList({ status: status === 'all' ? undefined : status, objectId })
      .then(result => {
        if (!cancelled) {
          setPredictions(result.items);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(formatBffErrorMessage(err, 'Не удалось загрузить прогнозы.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, objectId]);

  return { predictions, loading, error, status, setStatus, objectId, setObjectId };
}
