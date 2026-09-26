import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import GroupMembersEditor from './GroupMembersEditor';
import { useCreateGroup } from './hooks/useCreateGroup';
import { useGroups } from './hooks/useGroups';

const emptyForm = { code: '', name: '' };

export default function GroupsPanel() {
  const { groups, loading, error, reload } = useGroups();
  const { createGroup, loading: creating, error: createError } = useCreateGroup();
  const canCreate = usePermission('groups', 'create');

  const [form, setForm] = useState(emptyForm);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createGroup(form);
    if (created) {
      setForm(emptyForm);
      reload();
    }
  }

  return (
    <div className="pd-body">
      <p className="pd-section-title">Группы</p>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && groups.length === 0 && <EmptyState>Групп пока нет</EmptyState>}

      {groups.map(group => (
        <button
          key={group.id}
          className={`queue-item ${selectedGroupId === group.id ? 'active' : ''}`}
          onClick={() => setSelectedGroupId(current => (current === group.id ? null : group.id))}
        >
          <div className="queue-top">
            <span className="queue-obj">{group.name}</span>
            {group.isSystem && <Badge tone="low">системная</Badge>}
          </div>

          <div className="queue-meta mono">{group.code}</div>
        </button>
      ))}

      {selectedGroupId && <GroupMembersEditor groupId={selectedGroupId} />}

      {canCreate && (
        <>
          <p className="pd-section-title">Добавить группу</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Код
              <input
                value={form.code}
                onChange={setField('code')}
                pattern="[a-z0-9_-]+"
                title="строчные латинские буквы, цифры, - и _"
                disabled={creating}
                required
              />
            </label>

            <label>
              Название
              <input value={form.name} onChange={setField('name')} disabled={creating} required />
            </label>

            {createError && <div className="login-error">{createError}</div>}

            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'Создание…' : 'Добавить группу'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
