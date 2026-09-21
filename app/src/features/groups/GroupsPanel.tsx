import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useCreateGroup } from './hooks/useCreateGroup';
import { useGroups } from './hooks/useGroups';

const emptyForm = { code: '', name: '' };

export default function GroupsPanel() {
  const { groups, loading, error, reload } = useGroups();
  const { createGroup, loading: creating, error: createError } = useCreateGroup();
  const canCreate = usePermission('groups', 'create');

  const [form, setForm] = useState(emptyForm);

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
        <div className="hist-item" key={group.id}>
          <span>
            {group.name} <span className="mono">({group.code})</span>
          </span>

          <span className="d">{group.isSystem ? 'системная' : ''}</span>
        </div>
      ))}

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
