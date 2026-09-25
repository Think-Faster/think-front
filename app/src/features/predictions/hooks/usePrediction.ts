import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { CreatePredictionDecisionRequest, Prediction } from '../../../entities/prediction/types';

export function usePrediction(id: string | undefined) {
  const [prediction, setPrediction] = useState<Prediction | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  const load = useCallback(() => {
    if (!id) {
      setPrediction(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    predictionRepository
      .get(id)
      .then(setPrediction)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить прогноз.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(request: CreatePredictionDecisionRequest): Promise<boolean> {
    if (!id) {
      return false;
    }

    setDeciding(true);
    setDecisionError('');

    try {
      await predictionRepository.decide(id, request);
      load();
      return true;
    } catch (err) {
      setDecisionError(formatBffErrorMessage(err, 'Не удалось сохранить решение.'));
      return false;
    } finally {
      setDeciding(false);
    }
  }

  return { prediction, loading, error, decide, deciding, decisionError };
}
