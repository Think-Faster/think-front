import { Outlet } from 'react-router-dom';

import Header from './Header';
import WindowToolbar from './WindowToolbar';
import { WindowManager } from '../windows/WindowManager';

export default function AppLayout() {
  return (
    <WindowManager>

      <div className="shell">

        <Header />

        <WindowToolbar />

        <main className="workspace">
          <Outlet />
        </main>

      </div>

    </WindowManager>
  );
}