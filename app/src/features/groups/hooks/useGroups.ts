import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { groupRepository } from '../../../entities/group/groupRepository';
import { GroupListItem } from '../../../entities/group/types';

export function useGroups() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    groupRepository
      .getList()
      .then(result => setGroups(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить группы.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { groups, loading, error, reload };
}
