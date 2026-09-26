import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { useAuthStore } from '../stores/auth/authStore';
import AppRoutes from './AppRoutes';
import NavigationBridge from './NavigationBridge';

export default function App() {
  const status = useAuthStore(state => state.status);
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (status === 'unknown') {
    return <div className="app-loading">Загрузка…</div>;
  }

  return (
    <BrowserRouter>
      <NavigationBridge />
      <AppRoutes />
    </BrowserRouter>
  );
}
