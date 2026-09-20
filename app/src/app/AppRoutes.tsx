import { Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from '../pages/LoginPage';
import WorkspacePage from '../pages/WorkspacePage';
import WorkspaceLayout from './layouts/WorkspaceLayout';
import ProtectedRoute from './routing/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceLayout />}>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/dashboard" element={<WorkspacePage />} />
          <Route path="/predictions/:id" element={<WorkspacePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
