import { useLocation, useNavigate } from 'react-router-dom';

import { config } from '../core/config/config';
import LoginForm from '../features/auth/LoginForm';
import { LogoMark } from '../shared/ui/icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleSuccess() {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? '/', { replace: true });
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <LogoMark className="login-logo" />

        <h1 className="login-title">Авторизация</h1>

        <LoginForm onSuccess={handleSuccess} />

        <div className="login-environment">{config.environment}</div>
      </div>
    </div>
  );
}
