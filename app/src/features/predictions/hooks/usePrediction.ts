import { useCallback, useEffect, useState } from 'react';

import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { Prediction } from '../../../entities/prediction/types';

export function usePrediction(id: string | undefined) {
  const [prediction, setPrediction] = useState<Prediction | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) {
      setPrediction(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);

    predictionRepository.get(id).then(result => {
      setPrediction(result);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    if (!id) {
      return;
    }

    setPrediction(await predictionRepository.update(id, { status: 'work' }));
  }

  async function reject(reason: string) {
    if (!id) {
      return;
    }

    setPrediction(
      await predictionRepository.update(id, { status: 'rejected', rejectReason: reason })
    );
  }

  return { prediction, loading, accept, reject };
}
