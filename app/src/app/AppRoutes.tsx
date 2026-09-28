import { Navigate, Route, Routes } from 'react-router-dom';

import EngineerPage from '../pages/EngineerPage';
import LoginPage from '../pages/LoginPage';
import WorkspacePage from '../pages/WorkspacePage';
import EngineerLayout from './layouts/EngineerLayout';
import WorkspaceLayout from './layouts/WorkspaceLayout';
import ProtectedRoute from './routing/ProtectedRoute';
import SectionRoute from './routing/SectionRoute';

// Разделы верхнего уровня — core/registry/sectionRegistry.ts.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<SectionRoute sectionId="workspace" />}>
          <Route element={<WorkspaceLayout />}>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/dashboard" element={<WorkspacePage />} />
            <Route path="/predictions/:id" element={<WorkspacePage />} />
            <Route path="/tasks/:id" element={<WorkspacePage />} />
          </Route>
        </Route>

        <Route element={<SectionRoute sectionId="engineer" />}>
          <Route element={<EngineerLayout />}>
            <Route path="/engineer" element={<EngineerPage view="list" />} />
            <Route path="/engineer/tasks/:id" element={<EngineerPage view="task" />} />
            <Route path="/engineer/tasks/:id/report" element={<EngineerPage view="report" />} />
            <Route path="/engineer/tasks/:id/request" element={<EngineerPage view="request" />} />
            <Route path="/engineer/tasks/:id/sensors/:sensorId" element={<EngineerPage view="readings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
