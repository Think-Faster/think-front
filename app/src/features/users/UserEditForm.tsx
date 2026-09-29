import { ChangeEvent, FormEvent, useState } from 'react';

import Button from '../../shared/ui/Button';
import { TELEGRAM_USERNAME_PATTERN, UserListItem } from '../../entities/user/types';
import { useUpdateUser } from './hooks/useUpdateUser';

interface UserEditFormProps {
  user: UserListItem;
  onSaved: () => void;
  onCancel: () => void;
}

export default function UserEditForm({ user, onSaved, onCancel }: UserEditFormProps) {
  const { updateUser, loading, error } = useUpdateUser();

  const [form, setForm] = useState({
    lastName: user.lastName,
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    authUserId: user.authUserId,
    isActive: user.isActive,
    email: user.email ?? '',
    telegram: user.telegram ? `@${user.telegram}` : '',
  });

  function setField(field: 'lastName' | 'firstName' | 'middleName' | 'authUserId' | 'email' | 'telegram') {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setForm(current => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const updated = await updateUser(user.id, {
      lastName: form.lastName,
      firstName: form.firstName,
      middleName: form.middleName || null,
      authUserId: form.authUserId,
      isActive: form.isActive,
      email: form.email || null,
      // '' — убрать имя; BFF сохраняет без @ и в нижнем регистре.
      telegram: form.telegram.trim(),
    });

    if (updated) {
      onSaved();
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Фамилия
        <input value={form.lastName} onChange={setField('lastName')} disabled={loading} required />
      </label>

      <label>
        Имя
        <input value={form.firstName} onChange={setField('firstName')} disabled={loading} required />
      </label>

      <label>
        Отчество
        <input value={form.middleName} onChange={setField('middleName')} disabled={loading} />
      </label>

      <label>
        ID учётной записи
        <input value={form.authUserId} onChange={setField('authUserId')} disabled={loading} required />
      </label>

      <label>
        Email (для уведомлений)
        <input type="email" value={form.email} onChange={setField('email')} disabled={loading} />
      </label>

      <label>
        Telegram (для уведомлений)
        <input
          value={form.telegram}
          onChange={setField('telegram')}
          placeholder="@имя"
          pattern={TELEGRAM_USERNAME_PATTERN}
          title="Имя пользователя Telegram: 5–32 символа, латиница, цифры и _"
          disabled={loading}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
          disabled={loading}
        />
        Активен
      </label>

      {error && <div className="login-error">{error}</div>}

      <div className="pd-actions">
        <Button type="button" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}
