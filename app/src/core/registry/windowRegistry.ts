import { ComponentType } from 'react';

import { hasPermission, PermissionAction } from '../permissions/permissionService';
import AccessWindow from '../../features/access/AccessWindow';
import AssetsWindow from '../../features/assets/AssetsWindow';
import ConfigWindow from '../../features/config/ConfigWindow';
import PredictionDetailWindow from '../../features/predictions/PredictionDetailWindow';
import PredictionQueueWindow from '../../features/predictions/PredictionQueueWindow';

export interface WindowDefaultView {
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
  z: number;
}

export interface WindowPermissionRequirement {
  resource: string;
  action: PermissionAction;
}

export interface WindowDefinition {
  id: string;
  title: string;
  component: ComponentType;
  defaultView: WindowDefaultView;
  // Все текущие окна завязаны на реальные BFF-ресурсы, поэтому
  // requiredPermission обязателен — окно видно, только если у пользователя
  // есть хотя бы одно из перечисленных прав (логическое ИЛИ). Если когда-то
  // появится окно на локальных моках без реального ресурса за ним — это
  // поле можно сделать необязательным снова (было так раньше).
  //
  // Действие здесь всегда 'read' (видимость раздела = есть доступ на
  // просмотр), даже если внутри окна есть более строгие операции
  // (create/update/manage) — их гейтит сам компонент окна через
  // usePermission()/can() по месту (см. ConfigWindow: видно всем с
  // permissions:read, кнопки редактирования — только с permissions:manage).
  // Не сужай requiredPermission до более высокого права ради "заодно
  // спрятать кнопки" — тогда пользователи с одним read вообще не увидят
  // раздел.
  requiredPermission: WindowPermissionRequirement[];
}

export function isWindowVisible(
  definition: WindowDefinition,
  permissions: Record<string, PermissionAction[]>
): boolean {
  return definition.requiredPermission.some(({ resource, action }) =>
    hasPermission(permissions, resource, action)
  );
}

// Adding a new workspace window is a registry entry, not a change to
// WorkspaceCanvas or WindowToolbar (see архитектура §21, §54).
export const windowRegistry: WindowDefinition[] = [
  {
    id: 'queue',
    title: 'Очередь прогнозов',
    component: PredictionQueueWindow,
    defaultView: { x: 20, y: 20, width: 320, height: 480, open: true, z: 10 },
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'pred',
    title: 'Карточка прогноза',
    component: PredictionDetailWindow,
    defaultView: { x: 360, y: 20, width: 360, height: 560, open: true, z: 11 },
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'access',
    title: 'Пользователи и группы',
    component: AccessWindow,
    defaultView: { x: 740, y: 20, width: 420, height: 480, open: false, z: 12 },
    requiredPermission: [
      { resource: 'users', action: 'read' },
      { resource: 'groups', action: 'read' },
    ],
  },
  {
    id: 'config',
    title: 'Конфигурация доступа',
    component: ConfigWindow,
    defaultView: { x: 740, y: 520, width: 480, height: 480, open: false, z: 13 },
    requiredPermission: [{ resource: 'permissions', action: 'read' }],
  },
  {
    id: 'assets',
    title: 'Объекты и датчики',
    component: AssetsWindow,
    defaultView: { x: 20, y: 520, width: 420, height: 480, open: false, z: 14 },
    requiredPermission: [
      { resource: 'objects', action: 'read' },
      { resource: 'sensors', action: 'read' },
    ],
  },
];
