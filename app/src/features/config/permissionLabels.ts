import { PermissionAction } from '../../core/permissions/permissionService';

export const permissionLabels: Record<PermissionAction, string> = {
  create: 'создание',
  read: 'чтение',
  update: 'изменение',
  delete: 'удаление',
  export: 'экспорт',
  import: 'импорт',
  manage: 'управление',
};

export const permissionOptions: { value: PermissionAction; label: string }[] = (
  Object.entries(permissionLabels) as [PermissionAction, string][]
).map(([value, label]) => ({ value, label }));

export const principalTypeOptions = [
  { value: 'user' as const, label: 'Пользователь' },
  { value: 'group' as const, label: 'Группа' },
];
