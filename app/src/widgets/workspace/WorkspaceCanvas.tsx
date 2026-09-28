import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { isWindowVisible, windowRegistry } from '../../core/registry/windowRegistry';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { openWindow } from '../../stores/workspace/workspaceCommands';
import FreeCanvas from './FreeCanvas';
import GridCanvas from './GridCanvas';

// Первый вход: открыть окна с defaultOpen, как только пришли права (до этого
// видимость окон неизвестна). Дальше раскладку ведёт пользователь.
function useSeedDefaultWindows() {
  const permissions = usePermissionsStore(state => state.map);
  const seeded = useLayoutStore(state => state.seeded);

  useEffect(() => {
    if (seeded || Object.keys(permissions).length === 0) {
      return;
    }
    windowRegistry
      .filter(definition => definition.defaultOpen && isWindowVisible(definition, permissions))
      .forEach(definition => openWindow(definition.id));
    useLayoutStore.getState().markSeeded();
  }, [permissions, seeded]);
}

// Ссылка на карточку (route в реестре) открывает её окно, если его закрыли.
// Окно без прав не открывается — как и в шторке, его просто нет.
function useRouteWindows() {
  const { pathname } = useLocation();
  const permissions = usePermissionsStore(state => state.map);

  useEffect(() => {
    const definition = windowRegistry.find(item => item.route && matchPath(item.route, pathname));
    if (definition && isWindowVisible(definition, permissions)) {
      openWindow(definition.id);
    }
  }, [pathname, permissions]);
}

function DragGhost() {
  const drag = useLayoutStore(state => state.drag);
  if (!drag || !drag.showGhost) {
    return null;
  }
  return (
    <div className={`drag-ghost ${drag.overTrash ? 'to-trash' : ''}`} style={{ left: drag.x, top: drag.y }}>
      {drag.title}
    </div>
  );
}

// Режим раскладки выбирает переключатель «Располагать окна внахлест?» в
// сайдбаре: «Да» — свободный холст, «Нет» — сегментная сетка.
export default function WorkspaceCanvas() {
  const overlap = useLayoutStore(state => state.overlap);

  useSeedDefaultWindows();
  useRouteWindows();

  return (
    <>
      {overlap ? <FreeCanvas /> : <GridCanvas />}
      <DragGhost />
    </>
  );
}
