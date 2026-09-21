import { create } from 'zustand';

import { permissionsApi } from '../../core/permissions/permissionsApi';
import type { PermissionAction } from '../../core/permissions/permissionService';

export type PermissionsMap = Record<string, PermissionAction[]>;

interface PermissionsState {
  map: PermissionsMap;
  source: 'bff' | 'mock';
  load: () => Promise<void>;
}

// Пока BFF не поднят локально (или недоступен во время тестирования) —
// используем эту карту, чтобы UI оставался рабочим. Как только
// GET /permissions/me отвечает успешно, она заменяется реальными правами.
const mockPermissions: PermissionsMap = {
  users: ['create', 'read', 'update', 'delete'],
  groups: ['create', 'read', 'update', 'delete'],
  permissions: ['read'],
};

export const usePermissionsStore = create<PermissionsState>(set => ({
  map: mockPermissions,
  source: 'mock',

  load: async () => {
    try {
      const response = await permissionsApi.getMyPermissions();
      set({ map: response.permissions, source: 'bff' });
    } catch (error) {
      console.warn(
        'GET /permissions/me недоступна — используются тестовые права доступа',
        error
      );
      set({ map: mockPermissions, source: 'mock' });
    }
  },
}));
