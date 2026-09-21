import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { Grant } from '../../entities/grant/types';
import EmptyState from '../../shared/ui/EmptyState';
import { useGroups } from '../groups/hooks/useGroups';
import { useUsers } from '../users/hooks/useUsers';
import GrantForm from './GrantForm';
import GrantsList from './GrantsList';
import { useGrants } from './hooks/useGrants';
import { useResources } from './hooks/useResources';

export default function ConfigWindow() {
  const { grants, loading, error, reload } = useGrants();
  const { resources } = useResources();
  const { users } = useUsers();
  const { groups } = useGroups();
  const canManage = usePermission('permissions', 'manage');

  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);

  return (
    <div className="pd-body">
      <p className="pd-section-title">Права доступа</p>

      <GrantsList
        grants={grants}
        loading={loading}
        error={error}
        users={users}
        groups={groups}
        resources={resources}
        canManage={canManage}
        onEdit={setEditingGrant}
        onDeleted={reload}
      />

      {canManage ? (
        <>
          <p className="pd-section-title">{editingGrant ? 'Изменить права' : 'Выдать права'}</p>

          <GrantForm
            editingGrant={editingGrant}
            users={users}
            groups={groups}
            resources={resources}
            onSaved={() => {
              setEditingGrant(null);
              reload();
            }}
            onCancel={() => setEditingGrant(null)}
          />
        </>
      ) : (
        <EmptyState>Недостаточно прав для управления доступом</EmptyState>
      )}
    </div>
  );
}
