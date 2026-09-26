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

// Короткие подписи для колонок таблицы прав — полное слово даётся через title.
export const permissionShortLabels: Record<PermissionAction, string> = {
  create: 'созд',
  read: 'чтен',
  update: 'изм',
  delete: 'удал',
  export: 'эксп',
  import: 'имп',
  manage: 'упр',
};

export const principalTypeOptions = [
  { value: 'user' as const, label: 'Пользователь' },
  { value: 'group' as const, label: 'Группа' },
];
