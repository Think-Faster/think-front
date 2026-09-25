import { ComponentType } from 'react';

import { hasPermission, PermissionAction } from '../permissions/permissionService';
import AccessWindow from '../../features/access/AccessWindow';
import AssetsWindow from '../../features/assets/AssetsWindow';
import ConfigWindow from '../../features/config/ConfigWindow';
import IncidentsWindow from '../../features/incidents/IncidentsWindow';
import ModelSettingsWindow from '../../features/modelSettings/ModelSettingsWindow';
import PeopleWindow from '../../features/people/PeopleWindow';
import PredictionDetailWindow from '../../features/predictions/PredictionDetailWindow';
import PredictionQueueWindow from '../../features/predictions/PredictionQueueWindow';
import TaskDetailWindow from '../../features/tasks/TaskDetailWindow';
import TaskQueueWindow from '../../features/tasks/TaskQueueWindow';

export interface WindowPermissionRequirement {
  resource: string;
  action: PermissionAction;
}

export interface WindowDefinition {
  id: string;
  title: string;
  component: ComponentType;
  // Используется только для затравки самой первой сетки (когда в
  // localStorage ещё ничего нет) — по порядку реестра автоматически
  // размещает все окна с defaultOpen: true через тот же алгоритм, что и
  // клик по разделу в сайдбаре (см. core/workspace/gridStore.ts). Никакого
  // отношения к размеру/позиции — это теперь целиком состояние сетки.
  defaultOpen: boolean;
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
// WorkspaceCanvas or WorkspaceSidebar (see архитектура §21, §54).
export const windowRegistry: WindowDefinition[] = [
  {
    id: 'queue',
    title: 'Очередь прогнозов',
    component: PredictionQueueWindow,
    defaultOpen: true,
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'pred',
    title: 'Карточка прогноза',
    component: PredictionDetailWindow,
    defaultOpen: true,
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'access',
    title: 'Пользователи и группы',
    component: AccessWindow,
    defaultOpen: false,
    requiredPermission: [
      { resource: 'users', action: 'read' },
      { resource: 'groups', action: 'read' },
    ],
  },
  {
    id: 'config',
    title: 'Конфигурация доступа',
    component: ConfigWindow,
    defaultOpen: false,
    requiredPermission: [{ resource: 'permissions', action: 'read' }],
  },
  {
    id: 'assets',
    title: 'Объекты и датчики',
    component: AssetsWindow,
    defaultOpen: false,
    requiredPermission: [
      { resource: 'objects', action: 'read' },
      { resource: 'sensors', action: 'read' },
    ],
  },
  {
    id: 'taskQueue',
    title: 'Очередь заявок',
    component: TaskQueueWindow,
    defaultOpen: false,
    requiredPermission: [{ resource: 'tasks', action: 'read' }],
  },
  {
    id: 'taskDetail',
    title: 'Карточка заявки',
    component: TaskDetailWindow,
    defaultOpen: false,
    requiredPermission: [{ resource: 'tasks', action: 'read' }],
  },
  {
    id: 'incidents',
    title: 'Происшествия',
    component: IncidentsWindow,
    defaultOpen: false,
    requiredPermission: [{ resource: 'incidents', action: 'read' }],
  },
  {
    id: 'people',
    title: 'Люди',
    component: PeopleWindow,
    defaultOpen: false,
    requiredPermission: [
      { resource: 'schedule', action: 'read' },
      { resource: 'assigned_objects', action: 'read' },
      { resource: 'engineers', action: 'read' },
      { resource: 'presence', action: 'read' },
    ],
  },
  {
    id: 'modelSettings',
    title: 'Настройки модели',
    component: ModelSettingsWindow,
    defaultOpen: false,
    requiredPermission: [{ resource: 'model_settings', action: 'read' }],
  },
];
