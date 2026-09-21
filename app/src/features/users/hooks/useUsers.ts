import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { userRepository } from '../../../entities/user/userRepository';
import { UserListItem } from '../../../entities/user/types';

export function useUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    userRepository
      .getList()
      .then(result => setUsers(result.items))
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить пользователей.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { users, loading, error, reload };
}
