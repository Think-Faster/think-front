import { useState } from 'react';

import { formatBffErrorMessage } from '../../core/errors/bffError';
import { GroupListItem } from '../../entities/group/types';
import { grantRepository } from '../../entities/grant/grantRepository';
import { Grant } from '../../entities/grant/types';
import { Resource } from '../../entities/resource/types';
import { UserListItem } from '../../entities/user/types';
import EmptyState from '../../shared/ui/EmptyState';
import { permissionLabels } from './permissionLabels';

interface GrantsListProps {
  grants: Grant[];
  loading: boolean;
  error: string;
  users: UserListItem[];
  groups: GroupListItem[];
  resources: Resource[];
  canManage: boolean;
  onEdit: (grant: Grant) => void;
  onDeleted: () => void;
}

export default function GrantsList({
  grants,
  loading,
  error,
  users,
  groups,
  resources,
  canManage,
  onEdit,
  onDeleted,
}: GrantsListProps) {
  const [deleteError, setDeleteError] = useState('');

  function resolvePrincipalName(grant: Grant): string {
    if (grant.principalType === 'user') {
      const user = users.find(item => item.id === grant.principalId);
      return user ? `${user.lastName} ${user.firstName}` : grant.principalId;
    }

    const group = groups.find(item => item.id === grant.principalId);
    return group ? group.name : grant.principalId;
  }

  function resolveResourceName(resourceCode: string): string {
    const resource = resources.find(item => item.code === resourceCode);
    return resource ? resource.name : resourceCode;
  }

  async function handleDelete(grant: Grant) {
    setDeleteError('');

    try {
      await grantRepository.remove(grant.id);
      onDeleted();
    } catch (err) {
      setDeleteError(formatBffErrorMessage(err, 'Не удалось удалить права.'));
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {deleteError && <div className="status-note rej">{deleteError}</div>}
      {!loading && !error && grants.length === 0 && <EmptyState>Прав пока не выдано</EmptyState>}

      {grants.map(grant => (
        <div className="hist-item" key={grant.id}>
          <div>
            <div>
              {resolvePrincipalName(grant)}
              {grant.principalType === 'group' ? ' (группа)' : ''} · {resolveResourceName(grant.resourceCode)}
            </div>

            <div className="d">{grant.permissions.map(action => permissionLabels[action]).join(', ')}</div>
          </div>

          {canManage && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button className="chip-filter" onClick={() => onEdit(grant)}>
                Изменить
              </button>

              <button className="win-close" onClick={() => handleDelete(grant)} title="Отозвать права">
                ×
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
