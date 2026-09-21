import { usePermissionsStore } from '../../stores/permissions/permissionsStore';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'manage';

// Экспортирована для core/registry/windowRegistry.ts (видимость окна по
// правам — не хук, считается один раз на карте, а не на каждое окно).
export function hasPermission(
  map: Record<string, PermissionAction[]>,
  resource: string,
  action: PermissionAction
): boolean {
  const actions = map[resource];
  if (!actions) {
    return false;
  }

  // manage — надправо, см. docs/FRONTEND_INTEGRATION.md §4.
  return actions.includes(action) || actions.includes('manage');
}

// Для использования внутри React-компонентов — подписывается на стор, поэтому
// UI обновится сам, когда реальный /permissions/me заменит стартовую карту.
export function usePermission(resource: string, action: PermissionAction): boolean {
  return usePermissionsStore(state => hasPermission(state.map, resource, action));
}

// Для использования вне рендера (обработчики событий, guard-функции), где
// подписка не нужна — читает текущее значение стора.
export function can(resource: string, action: PermissionAction): boolean {
  return hasPermission(usePermissionsStore.getState().map, resource, action);
}
