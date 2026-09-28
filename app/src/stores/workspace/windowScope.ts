import { useCallback } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { isPrimaryInstance, useWindowInstance } from '../../core/workspace/windowInstance';
import { useSelectionStore } from '../selection/selectionStore';
import { InstanceContext, useInstanceStore } from './instanceStore';
import { openWindow } from './workspaceCommands';

// Объект, который показывает окно. Первый экземпляр следует общему выбору
// (клик по карте, «показать на карте», карточки) и сам его меняет; копия
// держит свой объект и общий выбор не трогает. Вне окна — общий выбор.
export function useWindowObject(): [number | null, (objectId: number | null) => void] {
  const instance = useWindowInstance();
  const globalId = useSelectionStore(state => state.objectId);
  const setGlobalId = useSelectionStore(state => state.setObjectId);
  const windowId = instance && !isPrimaryInstance(instance.windowId) ? instance.windowId : null;
  const ownId = useInstanceStore(state => (windowId ? state.contexts[windowId]?.objectId : undefined));
  const setContext = useInstanceStore(state => state.setContext);
  const setOwnId = useCallback(
    (objectId: number | null) => {
      if (windowId) {
        setContext(windowId, { objectId });
      }
    },
    [windowId, setContext]
  );

  if (!windowId) {
    return [globalId, setGlobalId];
  }
  return [ownId ?? null, setOwnId];
}

// Переход в другое окно с объектом («история», «логи» из карточки на карте
// или журнала): объект становится общим выбором, открывается первый
// экземпляр окна — он следует общему выбору, даже если переход из копии.
export function openWindowWithObject(windowId: string, objectId: number) {
  useSelectionStore.getState().setObjectId(objectId);
  openWindow(windowId);
}

// Сущность карточки: у копии — своя, у первого экземпляра — :id из адреса,
// если адрес ведёт на маршрут этой карточки (на /tasks/:id карточка прогноза
// не должна читать id заявки).
export function useWindowEntityId(): string | undefined {
  const instance = useWindowInstance();
  const { pathname } = useLocation();
  const windowId = instance && !isPrimaryInstance(instance.windowId) ? instance.windowId : null;
  const ownId = useInstanceStore(state => (windowId ? state.contexts[windowId]?.entityId : undefined));

  if (windowId) {
    return ownId;
  }
  return instance?.route ? matchPath(instance.route, pathname)?.params.id : undefined;
}

// Что показывает окно прямо сейчас — с этим открывается его копия
// (кнопка ⧉ в шапке, «+» у раздела в сайдбаре).
export function windowContextSnapshot(windowId: string, route: string | undefined, pathname: string): InstanceContext {
  if (!isPrimaryInstance(windowId)) {
    return { ...useInstanceStore.getState().contexts[windowId] };
  }
  const entityId = route ? matchPath(route, pathname)?.params.id : undefined;
  return { objectId: useSelectionStore.getState().objectId, ...(entityId ? { entityId } : {}) };
}
