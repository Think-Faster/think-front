import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './AppRoutes';
import { getCurrentUser } from '../api/auth';

export default function App() {
  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(() => {
        setAuthenticated(true);
      })
      .catch(() => {
        setAuthenticated(false);
      });
  }, []);

  if (authenticated === null) {
    return (
      <div className="app-loading">
        Загрузка…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes
        authenticated={authenticated}
        setAuthenticated={setAuthenticated}
      />
    </BrowserRouter>
  );
}