import { hasPermission, PermissionAction } from '../permissions/permissionService';
import { isWindowVisible, windowRegistry, WindowPermissionRequirement } from './windowRegistry';

// Разделы верхнего уровня — отдельные страницы со своим каркасом, не окна
// рабочей области. Раздел виден, если есть хотя бы одно из прав
// (логическое ИЛИ, как у окон).
export interface SectionDefinition {
  id: string;
  title: string;
  path: string;
  // Раздел для телефона: на узком экране открывается сразу после входа.
  mobile?: boolean;
  isVisible: (permissions: Record<string, PermissionAction[]>) => boolean;
}

function anyOf(requirements: WindowPermissionRequirement[]) {
  return (permissions: Record<string, PermissionAction[]>) =>
    requirements.some(({ resource, action }) => hasPermission(permissions, resource, action));
}

export const sectionRegistry: SectionDefinition[] = [
  {
    id: 'workspace',
    title: 'Рабочая область',
    path: '/',
    // Рабочая область видна, пока в ней есть хотя бы одно доступное окно.
    isVisible: permissions => windowRegistry.some(definition => isWindowVisible(definition, permissions)),
  },
  {
    id: 'engineer',
    title: 'Мои заявки',
    path: '/engineer',
    mobile: true,
    isVisible: anyOf([{ resource: 'tasks', action: 'read' }]),
  },
];

export function findSection(id: string): SectionDefinition | undefined {
  return sectionRegistry.find(section => section.id === id);
}

export function visibleSections(permissions: Record<string, PermissionAction[]>): SectionDefinition[] {
  return sectionRegistry.filter(section => section.isVisible(permissions));
}
