import { Outlet } from 'react-router-dom';

import { useLayoutStore } from '../../stores/workspace/layoutStore';
import WorkspaceSidebar from '../../widgets/workspace/WorkspaceSidebar';

// По макету «думай резче» шапки нет: холст на весь экран, шторка сайдбара
// лежит поверх него слева. Меню пользователя переехало в низ шторки
// (widgets/header/AppHeader.tsx больше не подключается).
export default function WorkspaceLayout() {
  const overlap = useLayoutStore(state => state.overlap);
  const collapsed = useLayoutStore(state => state.sidebarCollapsed);

  return (
    <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <main className={`workspace ${overlap ? 'mode-free' : 'mode-grid'}`}>
        <Outlet />
      </main>

      <WorkspaceSidebar />
    </div>
  );
}
