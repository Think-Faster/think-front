import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { groupRepository } from '../../../entities/group/groupRepository';
import { Group } from '../../../entities/group/types';

export function useGroupMembers(groupId: string | null) {
  const [group, setGroup] = useState<Group | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    if (!groupId) {
      setGroup(undefined);
      return;
    }

    setLoading(true);
    setError('');

    groupRepository
      .get(groupId)
      .then(setGroup)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить группу.')))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { group, loading, error, reload };
}
