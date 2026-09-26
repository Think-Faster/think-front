import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { taskRepository } from '../../../entities/task/taskRepository';
import { WorkTaskListItem, WorkTaskStatus } from '../../../entities/task/types';

export function useTasks() {
  const [status, setStatus] = useState<WorkTaskStatus | 'all'>('all');
  const [tasks, setTasks] = useState<WorkTaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    taskRepository
      .getList({ status: status === 'all' ? undefined : status })
      .then(result => setTasks(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить заявки.')))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tasks, loading, error, status, setStatus, reload };
}
