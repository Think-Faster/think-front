import { Outlet } from 'react-router-dom';

import AppHeader from '../../widgets/header/AppHeader';
import WorkspaceSidebar from '../../widgets/workspace/WorkspaceSidebar';

export default function WorkspaceLayout() {
  return (
    <div className="shell">
      <AppHeader />

      <div className="shell-body">
        <WorkspaceSidebar />

        <main className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
