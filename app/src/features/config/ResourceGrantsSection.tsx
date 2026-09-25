import { useEffect, useMemo, useState } from 'react';

import { formatBffErrorMessage } from '../../core/errors/bffError';
import { PermissionAction } from '../../core/permissions/permissionService';
import { GroupListItem } from '../../entities/group/types';
import { grantRepository } from '../../entities/grant/grantRepository';
import { Grant, PrincipalType } from '../../entities/grant/types';
import { Resource } from '../../entities/resource/types';
import { UserListItem } from '../../entities/user/types';
import Button from '../../shared/ui/Button';
import { permissionOptions, permissionShortLabels } from './permissionLabels';

interface GrantRow {
  key: string;
  grantId: string | null;
  principalType: PrincipalType;
  principalId: string;
  permissions: PermissionAction[];
}

interface ResourceGrantsSectionProps {
  resource: Resource;
  grants: Grant[];
  users: UserListItem[];
  groups: GroupListItem[];
  canManage: boolean;
  onChanged: () => void;
}

function rowsFromGrants(grants: Grant[]): GrantRow[] {
  return grants.map(grant => ({
    key: grant.id,
    grantId: grant.id,
    principalType: grant.principalType,
    principalId: grant.principalId,
    permissions: grant.permissions,
  }));
}

export default function ResourceGrantsSection({
  resource,
  grants: allGrants,
  users,
  groups,
  canManage,
  onChanged,
}: ResourceGrantsSectionProps) {
  // useMemo — не пересоздавать эту ссылку на каждый рендер родителя (он
  // перерисовывается по любой причине выше по дереву, не только из-за
  // грантов). Без этого resourceGrants была бы новым массивом каждый раз,
  // useEffect ниже видел бы её "изменившейся" и стирал бы несохранённые
  // правки в rows почти сразу после любого клика.
  const resourceGrants = useMemo(
    () => allGrants.filter(grant => grant.resourceCode === resource.code),
    [allGrants, resource.code]
  );

  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<GrantRow[]>(() => rowsFromGrants(resourceGrants));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Ресинк локальных строк с сервером — после успешного сохранения (onChanged
  // выше в дереве перезагружает гранты) или при первой загрузке.
  useEffect(() => {
    setRows(rowsFromGrants(resourceGrants));
  }, [resourceGrants]);

  function resolvePrincipalLabel(principalType: PrincipalType, principalId: string): string {
    if (principalType === 'user') {
      const user = users.find(item => item.id === principalId);
      return user ? `${user.lastName} ${user.firstName}` : principalId;
    }

    const group = groups.find(item => item.id === principalId);
    return group ? group.name : principalId;
  }

  function addRow() {
    setRows(current => [
      ...current,
      { key: `new-${Date.now()}`, grantId: null, principalType: 'user', principalId: '', permissions: [] },
    ]);
    setExpanded(true);
  }

  function discardRow(key: string) {
    setRows(current => current.filter(row => row.key !== key));
  }

  async function removeExistingRow(row: GrantRow) {
    if (!row.grantId) {
      return;
    }

    setError('');

    try {
      await grantRepository.remove(row.grantId);
      onChanged();
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось убрать права.'));
    }
  }

  function updatePrincipalType(key: string, principalType: PrincipalType) {
    setRows(current =>
      current.map(row => (row.key === key ? { ...row, principalType, principalId: '' } : row))
    );
  }

  function updatePrincipalId(key: string, principalId: string) {
    setRows(current => current.map(row => (row.key === key ? { ...row, principalId } : row)));
  }

  function togglePermission(key: string, action: PermissionAction) {
    setRows(current =>
      current.map(row =>
        row.key === key
          ? {
              ...row,
              permissions: row.permissions.includes(action)
                ? row.permissions.filter(item => item !== action)
                : [...row.permissions, action],
            }
          : row
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      for (const row of rows) {
        if (!row.principalId) {
          continue; // незаполненная добавленная строка — пропускаем
        }

        if (row.permissions.length === 0) {
          // Все галки сняты — это равносильно отзыву прав.
          if (row.grantId) {
            await grantRepository.remove(row.grantId);
          }
          continue;
        }

        // POST /permissions/grants не аддитивный — шлём весь текущий набор
        // галок целиком, он заменяет маску, а не дополняет её.
        await grantRepository.upsert({
          principalType: row.principalType,
          principalId: row.principalId,
          resourceCode: resource.code,
          permissions: row.permissions,
        });
      }

      onChanged();
    } catch (err) {
      setError(formatBffErrorMessage(err, 'Не удалось сохранить права.'));
    } finally {
      setSaving(false);
    }
  }

  const summary =
    rows.length > 0
      ? rows
          .filter(row => row.principalId)
          .map(row => resolvePrincipalLabel(row.principalType, row.principalId))
          .join(', ')
      : 'нет выданных прав';

  return (
    <div className="grant-section">
      <button type="button" className="grant-section-header" onClick={() => setExpanded(current => !current)}>
        <span className="queue-obj">{resource.name}</span>
        {!expanded && <span className="grant-summary">{summary}</span>}
        <span className="chip-filter">{expanded ? '▾ Свернуть' : '▸ Развернуть'}</span>
      </button>

      {expanded && (
        <div className="grant-table-wrap">
          <table className="grant-table">
            <thead>
              <tr>
                <th>Субъект</th>
                {permissionOptions.map(option => (
                  <th key={option.value} title={option.label}>
                    {permissionShortLabels[option.value]}
                  </th>
                ))}
                {canManage && <th />}
              </tr>
            </thead>

            <tbody>
              {rows.map(row => (
                <tr key={row.key}>
                  <td>
                    {row.grantId ? (
                      resolvePrincipalLabel(row.principalType, row.principalId)
                    ) : (
                      <div className="grant-new-row">
                        <select
                          value={row.principalType}
                          onChange={event =>
                            updatePrincipalType(row.key, event.target.value as PrincipalType)
                          }
                        >
                          <option value="user">Пользователь</option>
                          <option value="group">Группа</option>
                        </select>

                        <select
                          value={row.principalId}
                          onChange={event => updatePrincipalId(row.key, event.target.value)}
                        >
                          <option value="">— выбрать —</option>
                          {(row.principalType === 'user' ? users : groups).map(option => (
                            <option key={option.id} value={option.id}>
                              {row.principalType === 'user'
                                ? `${(option as UserListItem).lastName} ${(option as UserListItem).firstName}`
                                : (option as GroupListItem).name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>

                  {permissionOptions.map(option => (
                    <td key={option.value}>
                      <input
                        type="checkbox"
                        checked={row.permissions.includes(option.value)}
                        disabled={!canManage}
                        onChange={() => togglePermission(row.key, option.value)}
                      />
                    </td>
                  ))}

                  {canManage && (
                    <td>
                      <button
                        className="win-close"
                        onClick={() => (row.grantId ? removeExistingRow(row) : discardRow(row.key))}
                        title={row.grantId ? 'Отозвать права' : 'Убрать строку'}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {error && <div className="login-error">{error}</div>}

          {canManage && (
            <div className="pd-actions">
              <Button type="button" onClick={addRow} disabled={saving}>
                Добавить
              </Button>

              <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
