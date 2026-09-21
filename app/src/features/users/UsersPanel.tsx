import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { UserListItem } from '../../entities/user/types';
import { useCreateUser } from './hooks/useCreateUser';
import { useUsers } from './hooks/useUsers';
import UserEditForm from './UserEditForm';

const emptyForm = {
  userName: '',
  password: '',
  email: '',
  lastName: '',
  firstName: '',
  middleName: '',
};

export default function UsersPanel() {
  const { users, loading, error, reload } = useUsers();
  const { createUser, loading: creating, error: createError } = useCreateUser();
  const canCreate = usePermission('users', 'create');
  const canEdit = usePermission('users', 'update');

  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const created = await createUser(form);
    if (created) {
      setForm(emptyForm);
      reload();
    }
  }

  return (
    <div className="pd-body">
      <p className="pd-section-title">Пользователи</p>

      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && users.length === 0 && <EmptyState>Пользователей пока нет</EmptyState>}

      {users.map(user => (
        <div className="hist-item" key={user.id}>
          <span>
            {user.lastName} {user.firstName}
            {user.middleName ? ` ${user.middleName}` : ''}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="d">{user.isActive ? 'активен' : 'неактивен'}</span>

            {canEdit && (
              <button className="chip-filter" onClick={() => setEditingUser(user)}>
                Изменить
              </button>
            )}
          </span>
        </div>
      ))}

      {editingUser ? (
        <>
          <p className="pd-section-title">Редактировать пользователя</p>

          <UserEditForm
            user={editingUser}
            onCancel={() => setEditingUser(null)}
            onSaved={() => {
              setEditingUser(null);
              reload();
            }}
          />
        </>
      ) : (
        canCreate && (
          <>
            <p className="pd-section-title">Добавить пользователя</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Логин
                <input
                  value={form.userName}
                  onChange={setField('userName')}
                  autoComplete="off"
                  disabled={creating}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  autoComplete="off"
                  disabled={creating}
                  required
                />
              </label>

              <label>
                Пароль
                <input
                  type="password"
                  value={form.password}
                  onChange={setField('password')}
                  autoComplete="new-password"
                  disabled={creating}
                  required
                />
              </label>

              <label>
                Фамилия
                <input value={form.lastName} onChange={setField('lastName')} disabled={creating} required />
              </label>

              <label>
                Имя
                <input value={form.firstName} onChange={setField('firstName')} disabled={creating} required />
              </label>

              <label>
                Отчество
                <input value={form.middleName} onChange={setField('middleName')} disabled={creating} />
              </label>

              {createError && <div className="login-error">{createError}</div>}

              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? 'Создание…' : 'Добавить пользователя'}
              </Button>
            </form>
          </>
        )
      )}
    </div>
  );
}
