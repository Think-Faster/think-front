import { FormEvent, useEffect, useState } from 'react';

import { PermissionAction } from '../../core/permissions/permissionService';
import { GroupListItem } from '../../entities/group/types';
import { Grant, PrincipalType } from '../../entities/grant/types';
import { Resource } from '../../entities/resource/types';
import { UserListItem } from '../../entities/user/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import ChipToggleGroup from '../../shared/ui/ChipToggleGroup';
import { useUpsertGrant } from './hooks/useUpsertGrant';
import { permissionOptions, principalTypeOptions } from './permissionLabels';

interface GrantFormProps {
  editingGrant: Grant | null;
  users: UserListItem[];
  groups: GroupListItem[];
  resources: Resource[];
  onSaved: () => void;
  onCancel: () => void;
}

const emptyState = {
  principalType: 'user' as PrincipalType,
  principalId: '',
  resourceCode: '',
  permissions: [] as PermissionAction[],
};

export default function GrantForm({
  editingGrant,
  users,
  groups,
  resources,
  onSaved,
  onCancel,
}: GrantFormProps) {
  const { upsertGrant, loading, error } = useUpsertGrant();

  const [principalType, setPrincipalType] = useState<PrincipalType>(emptyState.principalType);
  const [principalId, setPrincipalId] = useState(emptyState.principalId);
  const [resourceCode, setResourceCode] = useState(emptyState.resourceCode);
  const [permissions, setPermissions] = useState<PermissionAction[]>(emptyState.permissions);

  useEffect(() => {
    if (editingGrant) {
      setPrincipalType(editingGrant.principalType);
      setPrincipalId(editingGrant.principalId);
      setResourceCode(editingGrant.resourceCode);
      setPermissions(editingGrant.permissions);
    } else {
      setPrincipalType(emptyState.principalType);
      setPrincipalId(emptyState.principalId);
      setResourceCode(emptyState.resourceCode);
      setPermissions(emptyState.permissions);
    }
  }, [editingGrant]);

  const principalOptions =
    principalType === 'user'
      ? users.map(user => ({ id: user.id, label: `${user.lastName} ${user.firstName}` }))
      : groups.map(group => ({ id: group.id, label: group.name }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const saved = await upsertGrant({ principalType, principalId, resourceCode, permissions });
    if (saved) {
      onSaved();
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Тип субъекта
        <ChipFilterGroup
          options={principalTypeOptions}
          value={principalType}
          onChange={value => {
            setPrincipalType(value);
            setPrincipalId('');
          }}
        />
      </label>

      <label>
        Субъект
        <select
          value={principalId}
          onChange={event => setPrincipalId(event.target.value)}
          disabled={loading}
          required
        >
          <option value="">— выбрать —</option>
          {principalOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Сущность
        <select
          value={resourceCode}
          onChange={event => setResourceCode(event.target.value)}
          disabled={loading}
          required
        >
          <option value="">— выбрать —</option>
          {resources.map(resource => (
            <option key={resource.code} value={resource.code}>
              {resource.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Права
        <ChipToggleGroup options={permissionOptions} value={permissions} onChange={setPermissions} />
      </label>

      {error && <div className="login-error">{error}</div>}

      <div className="pd-actions">
        {editingGrant && (
          <Button type="button" onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
        )}

        <Button type="submit" variant="primary" disabled={loading || permissions.length === 0}>
          {loading ? 'Сохранение…' : editingGrant ? 'Сохранить' : 'Выдать права'}
        </Button>
      </div>
    </form>
  );
}
