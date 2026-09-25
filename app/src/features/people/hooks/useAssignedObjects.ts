import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { assignedObjectRepository } from '../../../entities/assignedObject/assignedObjectRepository';
import { AssignedObject } from '../../../entities/assignedObject/types';

export function useAssignedObjects(userId: string | undefined) {
  const [assignedObjects, setAssignedObjects] = useState<AssignedObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    if (!userId) {
      setAssignedObjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    assignedObjectRepository
      .getList(userId)
      .then(setAssignedObjects)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить закреплённые объекты.')))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { assignedObjects, loading, error, reload };
}
