import { useCallback, useEffect, useState } from 'react';

import { emitDataEvent } from '../../../core/events/dataEvents';
import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { predictionRepository } from '../../../entities/prediction/predictionRepository';
import { CreatePredictionDecisionRequest, Prediction } from '../../../entities/prediction/types';
import { taskRepository } from '../../../entities/task/taskRepository';
import { newTaskNumber } from '../../tasks/taskLabels';
import { predictionTypeLabels } from '../predictionLabels';

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
      emitDataEvent('prediction.updated');
      return true;
    } catch (err) {
      setDecisionError(formatBffErrorMessage(err, 'Не удалось сохранить решение.'));
      return false;
    } finally {
      setDeciding(false);
    }
  }

  // «Взять в работу» — прогноз уходит в заявку (ТЗ: карточка прогноза → task.created).
  // BFF на take только меняет статус, поэтому заявку с прогнозом-основанием
  // заводим здесь же. Возвращает id заявки или null.
  async function takeToTask(): Promise<string | null> {
    if (!id || !prediction) {
      return null;
    }

    setDeciding(true);
    setDecisionError('');

    let taken = false;
    try {
      await predictionRepository.decide(id, { action: 'take' });
      taken = true;

      const task = await taskRepository.create({
        number: newTaskNumber(),
        sourceType: 'prediction',
        objectId: prediction.objectId,
        topic: prediction.topic,
        description: prediction.recommendation ?? prediction.description,
        faultClassification: prediction.classification ?? predictionTypeLabels[prediction.type],
        priority: 3,
      });
      await taskRepository.addPrediction(task.id, { predictionId: id, isPrimary: true });

      emitDataEvent('task.created');
      emitDataEvent('prediction.updated');
      return task.id;
    } catch (err) {
      setDecisionError(
        taken
          ? `Прогноз взят, но заявку создать не удалось — создайте её вручную. ${formatBffErrorMessage(err, '')}`.trim()
          : formatBffErrorMessage(err, 'Не удалось взять прогноз в работу.')
      );
      if (taken) {
        load();
        emitDataEvent('prediction.updated');
      }
      return null;
    } finally {
      setDeciding(false);
    }
  }

  return { prediction, loading, error, decide, takeToTask, deciding, decisionError };
}
