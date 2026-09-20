import { Outlet } from 'react-router-dom';

import AppHeader from '../../widgets/header/AppHeader';
import WindowToolbar from '../../widgets/workspace/WindowToolbar';

export default function WorkspaceLayout() {
  return (
    <div className="shell">
      <AppHeader />
      <WindowToolbar />

      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
