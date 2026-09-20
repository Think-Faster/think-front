export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'manage';

// MVP: RBAC is not enforced on the frontend yet — the BFF is the source of
// truth. This is the single seam UI code calls through, so a real check
// (backed by the user's resolved permissions) can replace this body later
// without touching call sites.
export function can(_resource: string, _action: PermissionAction): boolean {
  return true;
}
