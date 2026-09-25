import { ComponentType } from 'react';

import { hasPermission, PermissionAction } from '../permissions/permissionService';
import AccessWindow from '../../features/access/AccessWindow';
import AssetsWindow from '../../features/assets/AssetsWindow';
import ConfigWindow from '../../features/config/ConfigWindow';

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
    id: 'access',
    title: 'Пользователи и группы',
    component: AccessWindow,
    defaultView: { x: 20, y: 20, width: 420, height: 480, open: true, z: 10 },
    requiredPermission: [
      { resource: 'users', action: 'read' },
      { resource: 'groups', action: 'read' },
    ],
  },
  {
    id: 'config',
    title: 'Конфигурация доступа',
    component: ConfigWindow,
    defaultView: { x: 460, y: 20, width: 480, height: 480, open: false, z: 11 },
    requiredPermission: [{ resource: 'permissions', action: 'manage' }],
  },
  {
    id: 'assets',
    title: 'Объекты и датчики',
    component: AssetsWindow,
    defaultView: { x: 960, y: 20, width: 420, height: 480, open: true, z: 12 },
    requiredPermission: [
      { resource: 'objects', action: 'read' },
      { resource: 'sensors', action: 'read' },
    ],
  },
];
