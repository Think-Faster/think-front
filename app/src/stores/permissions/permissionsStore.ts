import { create } from 'zustand';

import { permissionsApi } from '../../core/permissions/permissionsApi';
import type { PermissionAction } from '../../core/permissions/permissionService';

export type PermissionsMap = Record<string, PermissionAction[]>;

// idle — ещё не спрашивали, loading — ждём ответа, ready — ответ получен
// (карта может быть пустой: прав нет), error — запрос не прошёл.
export type PermissionsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PermissionsState {
  map: PermissionsMap;
  status: PermissionsStatus;
  load: () => Promise<void>;
}

// Пустая карта = нет прав ни на один ресурс. Это и стартовое значение (пока
// GET /permissions/me ещё не ответил), и то, во что карта откатывается при
// ошибке запроса — раздел, завязанный на права, не должен показываться
// "на всякий случай". Разделы на локальных моках (предсказания) под это не
// подпадают — они не требуют permission вовсе, см.
// core/registry/windowRegistry.ts. Отличить «прав нет» от «не загрузилось»
// можно по status — шторка пишет об этом, а не остаётся пустой.
export const usePermissionsStore = create<PermissionsState>(set => ({
  map: {},
  status: 'idle',

  load: async () => {
    set({ status: 'loading' });
    try {
      const response = await permissionsApi.getMyPermissions();
      set({ map: response.permissions ?? {}, status: 'ready' });
    } catch (error) {
      console.warn('GET /permissions/me недоступна — доступ к разделам с правами скрыт', error);
      set({ map: {}, status: 'error' });
    }
  },
}));
