import type { AssigneeRole } from '../../entities/task/types';
import { hasPermission, PermissionAction } from '../permissions/permissionService';
import { isWindowVisible, windowRegistry } from './windowRegistry';

// Что решает видимость раздела: права и группы пользователя (GET /permissions/me).
// Роли — это группы BFF: у admins все права, но инженерами они не становятся.
export interface SectionAccess {
  permissions: Record<string, PermissionAction[]>;
  groups: string[];
}

// Разделы верхнего уровня — отдельные страницы со своим каркасом, не окна
// рабочей области.
export interface SectionDefinition {
  id: string;
  title: string;
  path: string;
  // Раздел для телефона: на узком экране открывается сразу после входа.
  mobile?: boolean;
  isVisible: (access: SectionAccess) => boolean;
}

// Та же группа, из которой BFF берёт исполнителей (/tasks/assignees?role=engineers).
const ENGINEERS: AssigneeRole = 'engineers';

export const sectionRegistry: SectionDefinition[] = [
  {
    id: 'workspace',
    title: 'Рабочая область',
    path: '/',
    // Рабочая область видна, пока в ней есть хотя бы одно доступное окно.
    isVisible: ({ permissions }) => windowRegistry.some(definition => isWindowVisible(definition, permissions)),
  },
  {
    id: 'engineer',
    title: 'Мои заявки',
    path: '/engineer',
    mobile: true,
    // Свои заявки — только у инженера: участник группы engineers (с подгруппами) с tasks:read.
    isVisible: ({ permissions, groups }) => groups.includes(ENGINEERS) && hasPermission(permissions, 'tasks', 'read'),
  },
];

export function findSection(id: string): SectionDefinition | undefined {
  return sectionRegistry.find(section => section.id === id);
}

export function visibleSections(access: SectionAccess): SectionDefinition[] {
  return sectionRegistry.filter(section => section.isVisible(access));
}
