import { matchPath, useLocation } from 'react-router-dom';

import { findWindowDefinition, isWindowVisible, WindowDefinition } from '../../core/registry/windowRegistry';
import { isPrimaryInstance, WindowInstanceContext } from '../../core/workspace/windowInstance';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { useInstanceStore } from '../../stores/workspace/instanceStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';
import { windowContextSnapshot } from '../../stores/workspace/windowScope';
import { openWindowCopy } from '../../stores/workspace/workspaceCommands';

// Окно реестра для экземпляра на холсте (`map`, `map:2`), если оно
// существует и видно пользователю по правам.
export function useVisibleDefinition(windowId: string): WindowDefinition | undefined {
  const permissions = usePermissionsStore(state => state.map);
  const definition = findWindowDefinition(windowId);
  return definition && isWindowVisible(definition, permissions) ? definition : undefined;
}

// Содержимое окна. Кнопка ↻ в шапке увеличивает счётчик — окно
// перемонтируется и заново читает данные. Контекст экземпляра говорит
// содержимому, какое это окно: копия берёт свой объект, а не общий выбор.
export default function WindowContent({ windowId, definition }: { windowId: string; definition: WindowDefinition }) {
  const nonce = useLayoutStore(state => state.reloadNonce[windowId] ?? 0);
  const Content = definition.component;
  return (
    <WindowInstanceContext.Provider value={{ windowId, route: definition.route }}>
      <Content key={nonce} />
    </WindowInstanceContext.Provider>
  );
}

// Кнопка ⧉ в шапке: копия окна с тем же объектом или карточкой. У разделов
// без `multiple` кнопки нет.
export function useDuplicateWindow(windowId: string, definition: WindowDefinition): (() => void) | undefined {
  const { pathname } = useLocation();
  if (!definition.multiple) {
    return undefined;
  }
  return () => openWindowCopy(windowId, windowContextSnapshot(windowId, definition.route, pathname));
}

// Подпись свёрнутого окна (§7.3): тип окна и его контекст — номер карточки
// или объект. Что показывать, решает запись реестра (route,
// followsSelection), а не id окна; у копии — её собственный контекст.
export function useWindowContext(windowId: string): string {
  const { pathname } = useLocation();
  const globalObjectId = useSelectionStore(state => state.objectId);
  const own = useInstanceStore(state => state.contexts[windowId]);
  const definition = findWindowDefinition(windowId);
  const primary = isPrimaryInstance(windowId);

  const routeId = primary
    ? definition?.route
      ? matchPath(definition.route, pathname)?.params.id
      : undefined
    : own?.entityId;
  if (routeId) {
    return `№ ${routeId.slice(0, 8)}`;
  }
  const objectId = primary ? globalObjectId : own?.objectId ?? null;
  if (definition?.followsSelection && objectId !== null && objectId !== undefined) {
    return `объект #${objectId}`;
  }
  return '';
}
