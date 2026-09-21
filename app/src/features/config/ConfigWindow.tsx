import { usePermission } from '../../core/permissions/permissionService';
import EmptyState from '../../shared/ui/EmptyState';
import { useGroups } from '../groups/hooks/useGroups';
import { useUsers } from '../users/hooks/useUsers';
import { useGrants } from './hooks/useGrants';
import { useResources } from './hooks/useResources';
import ResourceGrantsSection from './ResourceGrantsSection';

export default function ConfigWindow() {
  const { grants, loading, error, reload } = useGrants();
  const { resources, loading: resourcesLoading, error: resourcesError } = useResources();
  const { users } = useUsers();
  const { groups } = useGroups();
  const canManage = usePermission('permissions', 'manage');

  return (
    <div className="pd-body">
      <p className="pd-section-title">Права доступа по сущностям</p>

      {(loading || resourcesLoading) && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {resourcesError && <div className="status-note rej">{resourcesError}</div>}
      {!resourcesLoading && !resourcesError && resources.length === 0 && (
        <EmptyState>Сущностей пока нет</EmptyState>
      )}

      {resources.map(resource => (
        <ResourceGrantsSection
          key={resource.code}
          resource={resource}
          grants={grants}
          users={users}
          groups={groups}
          canManage={canManage}
          onChanged={reload}
        />
      ))}
    </div>
  );
}
