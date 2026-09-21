import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { userRepository } from '../../../entities/user/userRepository';
import { UpdateUserRequest, User } from '../../../entities/user/types';

export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function updateUser(id: string, request: UpdateUserRequest): Promise<User | null> {
    setLoading(true);
    setError('');

    try {
      return await userRepository.update(id, request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить пользователя.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { updateUser, loading, error };
}
