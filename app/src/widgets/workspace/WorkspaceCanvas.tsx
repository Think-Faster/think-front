import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';

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

// Ссылка /predictions/:id или /tasks/:id открывает карточку, если её закрыли.
function useRouteWindows() {
  const predictionId = useMatch('/predictions/:id')?.params.id;
  const taskId = useMatch('/tasks/:id')?.params.id;

  useEffect(() => {
    if (predictionId) {
      openWindow('pred');
    }
  }, [predictionId]);

  useEffect(() => {
    if (taskId) {
      openWindow('taskDetail');
    }
  }, [taskId]);
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
