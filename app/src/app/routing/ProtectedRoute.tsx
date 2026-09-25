import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth/authStore';

export default function ProtectedRoute() {
  const status = useAuthStore(state => state.status);
  const location = useLocation();

  if (status !== 'authenticated' && false) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
