import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import AppLayout from '../components/layouts/AppLayout';
import ProtectedRoute from '../routes/ProtectedRoute';

interface Props {
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export default function AppRoutes({
  authenticated,
  setAuthenticated,
}: Props) {
  return (
    <Routes>

      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={() => setAuthenticated(true)}
          />
        }
      />

      <Route element={
        <ProtectedRoute
          isAuthenticated={authenticated}
        />
      }>

        <Route
          element={<AppLayout />}
        >

          <Route
            path="/"
            element={<DashboardPage />}
          />

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/predictions/:id"
            element={<DashboardPage />}
          />

        </Route>

      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}