import { ComponentType } from 'react';

import { hasPermission, PermissionAction } from '../permissions/permissionService';
import AccessWindow from '../../features/access/AccessWindow';
import AssetsWindow from '../../features/assets/AssetsWindow';
import ConfigWindow from '../../features/config/ConfigWindow';
import DataLogWindow from '../../features/dataLog/DataLogWindow';
import IncidentsWindow from '../../features/incidents/IncidentsWindow';
import MapWindow from '../../features/map/MapWindow';
import ModelSettingsWindow from '../../features/modelSettings/ModelSettingsWindow';
import ObjectHistoryWindow from '../../features/objectHistory/ObjectHistoryWindow';
import PeopleWindow from '../../features/people/PeopleWindow';
import PredictionDetailWindow from '../../features/predictions/PredictionDetailWindow';
import PredictionQueueWindow from '../../features/predictions/PredictionQueueWindow';
import TaskCreateWindow from '../../features/tasks/TaskCreateWindow';
import TaskDetailWindow from '../../features/tasks/TaskDetailWindow';
import TaskQueueWindow from '../../features/tasks/TaskQueueWindow';

export interface WindowPermissionRequirement {
  resource: string;
  action: PermissionAction;
}

// Где раздел живёт в сайдбаре: primary — шесть кнопок макета, more —
// служебные разделы под «Ещё разделы», detail — карточки, которые
// открываются по ссылке из журналов и в сайдбаре не показываются.
export type WindowSection = 'primary' | 'more' | 'detail';

export interface WindowDefinition {
  id: string;
  title: string;
  component: ComponentType;
  section: WindowSection;
  // Раздел-действие («Создать заявку»): у кнопки нет состояния «выбрано»,
  // повторный клик не закрывает окно.
  action?: boolean;
  // Открывается при самом первом входе (пока раскладка ещё не сохранена) —
  // тем же путём, что и клик по разделу, см. widgets/workspace/WorkspaceCanvas.tsx.
  defaultOpen: boolean;
  // Карточка по ссылке: переход на этот маршрут открывает окно, а номер из
  // маршрута (:id) попадает в подпись свёрнутого окна (§7.3).
  route?: string;
  // Окно показывает объект, выбранный на карте: его номер попадает в
  // подпись свёрнутого окна.
  followsSelection?: boolean;
  // Все текущие окна завязаны на реальные BFF-ресурсы, поэтому
  // requiredPermission обязателен — окно видно, только если у пользователя
  // есть хотя бы одно из перечисленных прав (логическое ИЛИ). Если когда-то
  // появится окно на локальных моках без реального ресурса за ним — это
  // поле можно сделать необязательным снова (было так раньше).
  //
  // Действие здесь обычно 'read' (видимость раздела = есть доступ на
  // просмотр), даже если внутри окна есть более строгие операции
  // (create/update/manage) — их гейтит сам компонент окна через
  // usePermission()/can() по месту (см. ConfigWindow: видно всем с
  // permissions:read, кнопки редактирования — только с permissions:manage).
  // Не сужай requiredPermission до более высокого права ради "заодно
  // спрятать кнопки" — тогда пользователи с одним read вообще не увидят
  // раздел. Исключение — окно, которое целиком и есть операция
  // («Создать заявку» — tasks:create).
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
    id: 'map',
    title: 'Карта',
    component: MapWindow,
    section: 'primary',
    defaultOpen: true,
    followsSelection: true,
    requiredPermission: [{ resource: 'objects', action: 'read' }],
  },
  {
    id: 'queue',
    title: 'Журнал прогнозов',
    component: PredictionQueueWindow,
    section: 'primary',
    defaultOpen: true,
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'taskQueue',
    title: 'Дневник диспетчера',
    component: TaskQueueWindow,
    section: 'primary',
    defaultOpen: false,
    requiredPermission: [{ resource: 'tasks', action: 'read' }],
  },
  {
    id: 'objectHistory',
    title: 'История объектов',
    component: ObjectHistoryWindow,
    section: 'primary',
    defaultOpen: false,
    followsSelection: true,
    requiredPermission: [{ resource: 'objects', action: 'read' }],
  },
  {
    id: 'taskCreate',
    title: 'Создать заявку',
    component: TaskCreateWindow,
    section: 'primary',
    action: true,
    defaultOpen: false,
    requiredPermission: [{ resource: 'tasks', action: 'create' }],
  },
  {
    id: 'dataLog',
    title: 'Журнал данных',
    component: DataLogWindow,
    section: 'primary',
    defaultOpen: false,
    followsSelection: true,
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'pred',
    title: 'Карточка прогноза',
    component: PredictionDetailWindow,
    section: 'detail',
    defaultOpen: false,
    route: '/predictions/:id',
    requiredPermission: [{ resource: 'predictions', action: 'read' }],
  },
  {
    id: 'taskDetail',
    title: 'Карточка заявки',
    component: TaskDetailWindow,
    section: 'detail',
    defaultOpen: false,
    route: '/tasks/:id',
    requiredPermission: [{ resource: 'tasks', action: 'read' }],
  },
  {
    id: 'incidents',
    title: 'Происшествия',
    component: IncidentsWindow,
    section: 'more',
    defaultOpen: false,
    requiredPermission: [{ resource: 'incidents', action: 'read' }],
  },
  {
    id: 'assets',
    title: 'Объекты и датчики',
    component: AssetsWindow,
    section: 'more',
    defaultOpen: false,
    requiredPermission: [
      { resource: 'objects', action: 'read' },
      { resource: 'sensors', action: 'read' },
    ],
  },
  {
    id: 'people',
    title: 'Люди',
    component: PeopleWindow,
    section: 'more',
    defaultOpen: false,
    requiredPermission: [
      { resource: 'schedule', action: 'read' },
      { resource: 'assigned_objects', action: 'read' },
      { resource: 'engineers', action: 'read' },
      { resource: 'presence', action: 'read' },
    ],
  },
  {
    id: 'access',
    title: 'Пользователи и группы',
    component: AccessWindow,
    section: 'more',
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
    section: 'more',
    defaultOpen: false,
    requiredPermission: [{ resource: 'permissions', action: 'read' }],
  },
  {
    id: 'modelSettings',
    title: 'Настройки модели',
    component: ModelSettingsWindow,
    section: 'more',
    defaultOpen: false,
    requiredPermission: [{ resource: 'model_settings', action: 'read' }],
  },
];
