import { PermissionAction } from '../../core/permissions/permissionService';

export type PrincipalType = 'user' | 'group';

export interface Grant {
  id: string;
  principalType: PrincipalType;
  principalId: string;
  resourceCode: string;
  permissions: PermissionAction[];
}

// Полностью заменяет текущую маску прав для пары принципал+ресурс, не
// складывает с уже выданными — см. docs/FRONTEND_INTEGRATION.md §7.
export interface CreateGrantRequest {
  principalType: PrincipalType;
  principalId: string;
  resourceCode: string;
  permissions: PermissionAction[];
}
