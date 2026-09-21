import { ComponentType } from 'react';

import { hasPermission, PermissionAction } from '../permissions/permissionService';
import AccessWindow from '../../features/access/AccessWindow';
import PredictionDetailWindow from '../../features/predictions/PredictionDetailWindow';
import PredictionQueueWindow from '../../features/predictions/PredictionQueueWindow';
import ActionLogWidget from '../../widgets/actionLog/ActionLogWidget';
import MapWidget from '../../widgets/map/MapWidget';
import ObjectCardWidget from '../../widgets/objectCard/ObjectCardWidget';
import SchematicWidget from '../../widgets/schematic/SchematicWidget';
import StreamWidget from '../../widgets/stream/StreamWidget';
import TimelineWidget from '../../widgets/timeline/TimelineWidget';

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
  // Не задано — окно на локальных моках (не привязано к реальному BFF-
  // ресурсу), видно всегда. Задано — окно видно, только если у пользователя
  // есть хотя бы одно из перечисленных прав (логическое ИЛИ).
  requiredPermission?: WindowPermissionRequirement[];
}

export function isWindowVisible(
  definition: WindowDefinition,
  permissions: Record<string, PermissionAction[]>
): boolean {
  if (!definition.requiredPermission) {
    return true;
  }

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
    defaultView: { x: 20, y: 20, width: 300, height: 430, open: true, z: 10 },
  },
  {
    id: 'map',
    title: 'Карта',
    component: MapWidget,
    defaultView: { x: 336, y: 20, width: 520, height: 430, open: true, z: 11 },
  },
  {
    id: 'pred',
    title: 'Карточка прогноза',
    component: PredictionDetailWindow,
    defaultView: { x: 872, y: 20, width: 340, height: 560, open: true, z: 12 },
  },
  {
    id: 'schem',
    title: 'Схема объекта',
    component: SchematicWidget,
    defaultView: { x: 336, y: 466, width: 520, height: 340, open: false, z: 13 },
  },
  {
    id: 'timeline',
    title: 'История объекта',
    component: TimelineWidget,
    defaultView: { x: 336, y: 466, width: 420, height: 380, open: false, z: 14 },
  },
  {
    id: 'object',
    title: 'Карточка объекта',
    component: ObjectCardWidget,
    defaultView: { x: 20, y: 466, width: 640, height: 400, open: false, z: 15 },
  },
  {
    id: 'stream',
    title: 'Поток данных',
    component: StreamWidget,
    defaultView: { x: 20, y: 466, width: 300, height: 260, open: true, z: 16 },
  },
  {
    id: 'log',
    title: 'Журнал действий',
    component: ActionLogWidget,
    defaultView: { x: 1150, y: 466, width: 340, height: 300, open: true, z: 17 },
  },
  {
    id: 'access',
    title: 'Пользователи и группы',
    component: AccessWindow,
    defaultView: { x: 872, y: 466, width: 400, height: 420, open: false, z: 18 },
    requiredPermission: [
      { resource: 'users', action: 'read' },
      { resource: 'groups', action: 'read' },
    ],
  },
];
