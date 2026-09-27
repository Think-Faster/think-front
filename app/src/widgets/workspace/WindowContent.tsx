import { useMatch } from 'react-router-dom';

import { isWindowVisible, WindowDefinition, windowRegistry } from '../../core/registry/windowRegistry';
import { usePermissionsStore } from '../../stores/permissions/permissionsStore';
import { useSelectionStore } from '../../stores/selection/selectionStore';
import { useLayoutStore } from '../../stores/workspace/layoutStore';

// Окно реестра, если оно существует и видно пользователю по правам.
export function useVisibleDefinition(windowId: string): WindowDefinition | undefined {
  const permissions = usePermissionsStore(state => state.map);
  const definition = windowRegistry.find(item => item.id === windowId);
  return definition && isWindowVisible(definition, permissions) ? definition : undefined;
}

// Содержимое окна. Кнопка ↻ в шапке увеличивает счётчик — окно
// перемонтируется и заново читает данные.
export default function WindowContent({ definition }: { definition: WindowDefinition }) {
  const nonce = useLayoutStore(state => state.reloadNonce[definition.id] ?? 0);
  const Content = definition.component;
  return <Content key={nonce} />;
}

// Подпись свёрнутого окна (§7.3): тип окна и его контекст — номер карточки
// или выбранный объект.
export function useWindowContext(windowId: string): string {
  const predictionMatch = useMatch('/predictions/:id');
  const taskMatch = useMatch('/tasks/:id');
  const objectId = useSelectionStore(state => state.objectId);

  if (windowId === 'pred' && predictionMatch?.params.id) {
    return `№ ${predictionMatch.params.id.slice(0, 8)}`;
  }
  if (windowId === 'taskDetail' && taskMatch?.params.id) {
    return `№ ${taskMatch.params.id.slice(0, 8)}`;
  }
  if ((windowId === 'map' || windowId === 'objectHistory' || windowId === 'dataLog') && objectId !== null) {
    return `объект #${objectId}`;
  }
  return '';
}
