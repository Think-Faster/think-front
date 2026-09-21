import { useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { groupRepository } from '../../../entities/group/groupRepository';
import { CreateGroupRequest, GroupListItem } from '../../../entities/group/types';

export function useCreateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createGroup(request: CreateGroupRequest): Promise<GroupListItem | null> {
    setLoading(true);
    setError('');

    try {
      return await groupRepository.create(request);
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось создать группу.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createGroup, loading, error };
}
