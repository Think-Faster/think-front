import { FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useModelVersions } from './hooks/useModelVersions';

export default function ModelVersionsTab() {
  const { versions, loading, error, createVersion, activateVersion, acting, actionError } = useModelVersions();
  const canManage = usePermission('model_settings', 'manage');

  const [id, setId] = useState('');
  const [name, setName] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (await createVersion({ id, name })) {
      setId('');
      setName('');
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && versions.length === 0 && <EmptyState>Версий модели пока нет</EmptyState>}

      {versions.map(version => (
        <div className="hist-item" key={version.id}>
          <div>
            <div>{version.name}</div>
            <div className="d">
              #{version.id}
              {version.switchedAt ? ` · переключена ${new Date(version.switchedAt).toLocaleString('ru-RU')}` : ''}
            </div>
          </div>

          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {version.isDefault && <Badge tone="low">активна</Badge>}

            {canManage && !version.isDefault && (
              <button className="chip-filter" onClick={() => activateVersion(version.id)} disabled={acting}>
                Активировать
              </button>
            )}
          </span>
        </div>
      ))}

      {actionError && <div className="login-error">{actionError}</div>}

      {canManage && (
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            ID
            <input value={id} onChange={event => setId(event.target.value)} disabled={acting} required />
          </label>

          <label>
            Название
            <input value={name} onChange={event => setName(event.target.value)} disabled={acting} required />
          </label>

          <Button type="submit" variant="primary" disabled={acting}>
            {acting ? 'Сохранение…' : 'Добавить версию'}
          </Button>
        </form>
      )}
    </div>
  );
}
