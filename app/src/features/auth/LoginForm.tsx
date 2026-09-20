import { FormEvent, useState } from 'react';

import { classifyError } from '../../core/errors/httpError';
import Button from '../../shared/ui/Button';
import { useAuthStore } from '../../stores/auth/authStore';

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useAuthStore(state => state.login);

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login({ userName, password });
      onSuccess();
    } catch (error) {
      const { kind } = classifyError(error);

      setError(
        kind === 'rateLimited'
          ? 'Слишком много попыток входа. Попробуйте позже.'
          : 'Неверный логин или пароль.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Логин
        <input
          value={userName}
          onChange={e => setUserName(e.target.value)}
          autoComplete="username"
          disabled={loading}
        />
      </label>

      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />
      </label>

      {error && <div className="login-error">{error}</div>}

      <Button type="submit" variant="primary" className="login-button" disabled={loading}>
        {loading ? 'Вход…' : 'Войти'}
      </Button>
    </form>
  );
}
