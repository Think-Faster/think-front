import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../api/auth';
import config from '../app/config';

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login({
        userName,
        password,
      });

      onLogin();
      navigate('/', { replace: true });
    } catch (error: any) {
      if (error.response?.status === 429) {
        setError(
          'Слишком много попыток входа. Попробуйте позже.'
        );
      } else {
        setError(
          'Неверный логин или пароль.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-brand">
          <span className="brand-mark" />
          {config.appName}
        </div>

        <div className="login-subtitle">
          Рабочее место диспетчера
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <label>
            Логин
            <input
              value={userName}
              onChange={e =>
                setUserName(e.target.value)
              }
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn primary login-button"
            disabled={loading}
          >
            {loading
              ? 'Вход…'
              : 'Войти'}
          </button>

        </form>

        <div className="login-environment">
          {config.environment}
        </div>

      </div>

    </div>
  );
}