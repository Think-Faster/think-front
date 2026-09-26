import { useLocation, useNavigate } from 'react-router-dom';

import { config } from '../core/config/config';
import LoginForm from '../features/auth/LoginForm';

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
        <div className="login-brand">
          <span className="brand-mark" />
          {config.appName}
        </div>

        <div className="login-subtitle">Рабочее место диспетчера</div>

        <LoginForm onSuccess={handleSuccess} />

        <div className="login-environment">{config.environment}</div>
      </div>
    </div>
  );
}
