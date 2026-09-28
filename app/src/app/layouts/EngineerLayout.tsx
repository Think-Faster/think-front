import { Outlet } from 'react-router-dom';

import { config } from '../../core/config/config';
import UserMenu from '../../features/auth/UserMenu';
import { LogoMark } from '../../shared/ui/icons';

// Раздел инженера — страница для телефона: белая шапка и лента под ней,
// без шторки и окон рабочей области. Прокручивается сама лента: body
// прокрутку не даёт (холст рабочей области на весь экран).
export default function EngineerLayout() {
  return (
    <div className="eng-shell">
      <header className="eng-header">
        <span className="eng-brand">
          <LogoMark className="eng-brand-mark" />
          {config.appName}
        </span>
        <UserMenu />
      </header>

      <main className="eng-main">
        <Outlet />
      </main>
    </div>
  );
}
