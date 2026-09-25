import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { taskRepository } from '../../../entities/task/taskRepository';
import { CreateWorkTaskRequest, WorkTask } from '../../../entities/task/types';

export function useCreateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createTask(request: CreateWorkTaskRequest): Promise<WorkTask | null> {
    setLoading(true);
    setError('');

    try {
      return await taskRepository.create(request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось создать заявку.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createTask, loading, error };
}
