import { ChangeEvent, FormEvent, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { UserListItem } from '../../entities/user/types';
import { CreateUserInput, useCreateUser } from './hooks/useCreateUser';
import { useUsers } from './hooks/useUsers';
import UserEditForm from './UserEditForm';

type AccountSource = 'new' | 'existing';

const accountSourceOptions: { value: AccountSource; label: string }[] = [
  { value: 'new', label: 'Новая учётная запись' },
  { value: 'existing', label: 'Существующая учётная запись' },
];

const emptyForm = {
  userName: '',
  password: '',
  email: '',
  authUserId: '',
  lastName: '',
  firstName: '',
  middleName: '',
};

export default function UsersPanel() {
  const { users, loading, error, reload } = useUsers();
  const { createUser, loading: creating, error: createError } = useCreateUser();
  const canCreate = usePermission('users', 'create');
  const canEdit = usePermission('users', 'update');

  const [accountSource, setAccountSource] = useState<AccountSource>('new');
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  function setField(field: keyof typeof emptyForm) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const input: CreateUserInput =
      accountSource === 'new'
        ? {
            accountSource: 'new',
            userName: form.userName,
            password: form.password,
            email: form.email,
            lastName: form.lastName,
            firstName: form.firstName,
            middleName: form.middleName,
          }
        : {
            accountSource: 'existing',
            authUserId: form.authUserId,
            email: form.email,
            lastName: form.lastName,
            firstName: form.firstName,
            middleName: form.middleName,
          };

    const created = await createUser(input);
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
            <span className="d">{user.email ?? 'нет email'}</span>
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

            <div className="win-toolbar">
              <ChipFilterGroup
                options={accountSourceOptions}
                value={accountSource}
                onChange={setAccountSource}
              />
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {accountSource === 'new' ? (
                <>
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
                </>
              ) : (
                <>
                  <label>
                    ID учётной записи
                    <input
                      value={form.authUserId}
                      onChange={setField('authUserId')}
                      placeholder="uuid из сервиса аутентификации"
                      autoComplete="off"
                      disabled={creating}
                      required
                    />
                  </label>

                  <label>
                    Email (для уведомлений)
                    <input
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      autoComplete="off"
                      disabled={creating}
                    />
                  </label>
                </>
              )}

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
