import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage, parseBffError } from '../../../core/errors/bffError';
import { taskRepository } from '../../../entities/task/taskRepository';
import {
  AddTaskPredictionRequest,
  CreateTaskAssignmentRequest,
  CreateTaskReportRequest,
  CreateTaskReturnRequest,
  WorkTask,
} from '../../../entities/task/types';

export function useTask(id: string | undefined) {
  const [task, setTask] = useState<WorkTask | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    if (!id) {
      setTask(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    taskRepository
      .get(id)
      .then(setTask)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить заявку.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function take(): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.take(id);
      load();
      return true;
    } catch (err) {
      // 409 task_already_taken — штатная гонка, не ошибка данных: отдельное
      // сообщение вместо общего "не удалось сохранить".
      const parsed = parseBffError(err);

      setActionError(
        parsed.code === 'task_already_taken'
          ? 'Заявку уже взяли в работу — обновляю список.'
          : formatBffErrorMessage(err, 'Не удалось взять заявку в работу.')
      );

      load();
      return false;
    } finally {
      setActing(false);
    }
  }

  async function addPrediction(request: AddTaskPredictionRequest): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.addPrediction(id, request);
      load();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось прикрепить прогноз.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function removePrediction(predictionId: string): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.removePrediction(id, predictionId);
      load();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось открепить прогноз.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function addAssignment(request: CreateTaskAssignmentRequest): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.addAssignment(id, request);
      load();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось назначить инженера.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function addReport(request: CreateTaskReportRequest): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.addReport(id, request);
      load();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось сохранить отчёт.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  async function addReturn(request: CreateTaskReturnRequest): Promise<boolean> {
    if (!id) {
      return false;
    }

    setActing(true);
    setActionError('');

    try {
      await taskRepository.addReturn(id, request);
      load();
      return true;
    } catch (err) {
      setActionError(formatBffErrorMessage(err, 'Не удалось вернуть заявку.'));
      return false;
    } finally {
      setActing(false);
    }
  }

  return {
    task,
    loading,
    error,
    acting,
    actionError,
    take,
    addPrediction,
    removePrediction,
    addAssignment,
    addReport,
    addReturn,
  };
}
