import { create } from 'zustand';

import { permissionsApi } from '../../core/permissions/permissionsApi';
import type { PermissionAction } from '../../core/permissions/permissionService';

export type PermissionsMap = Record<string, PermissionAction[]>;

interface PermissionsState {
  map: PermissionsMap;
  load: () => Promise<void>;
}

// Пустая карта = нет прав ни на один ресурс. Это и стартовое значение (пока
// GET /permissions/me ещё не ответил), и то, во что карта откатывается при
// ошибке запроса — раздел, завязанный на права, не должен показываться
// "на всякий случай". Разделы на локальных моках (предсказания) под это не
// подпадают — они не требуют permission вовсе, см.
// core/registry/windowRegistry.ts.
export const usePermissionsStore = create<PermissionsState>(set => ({
  map: {},

  load: async () => {
    try {
      const response = await permissionsApi.getMyPermissions();
      set({ map: response.permissions });
    } catch (error) {
      console.warn('GET /permissions/me недоступна — доступ к разделам с правами скрыт', error);
      set({ map: {} });
    }
  },
}));
