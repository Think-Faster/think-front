import { useEffect, useState } from 'react';

import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { Prediction, PredictionStatus, Risk } from '../../../entities/prediction/types';

export function usePredictions() {
  const [risk, setRisk] = useState<Risk | 'all'>('all');
  const [status, setStatus] = useState<PredictionStatus | 'all'>('all');
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    let cancelled = false;

    predictionRepository.getList({ risk, status }).then(list => {
      if (!cancelled) {
        setPredictions(list);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [risk, status]);

  return { predictions, risk, setRisk, status, setStatus };
}
