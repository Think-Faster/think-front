import { create } from 'zustand';

import { authApi } from '../../core/auth/authApi';
import { onUnauthorized } from '../../core/auth/authEvents';
import { clearAllCookies } from '../../core/auth/clearAllCookies';
import { CurrentUser, LoginRequest } from '../../core/auth/types';
import { redirectToLogin } from '../../core/routing/navigation';
import { usePermissionsStore } from '../permissions/permissionsStore';
import { useProfileStore } from '../profile/profileStore';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  initialize: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
  handleUnauthorized: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,

  initialize: async () => {
    try {
      const user = await authApi.getCurrentUser();
      set({ status: 'authenticated', user });
      usePermissionsStore.getState().load();
      useProfileStore.getState().load(user.id);
    } catch {
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async request => {
    const user = await authApi.login(request);
    set({ status: 'authenticated', user });
    usePermissionsStore.getState().load();
    useProfileStore.getState().load(user.id);
  },

  // Куки сессии HttpOnly снимает tf-auth (POST /auth/logout); без этого refresh-кука подняла бы
  // сессию снова на следующем /auth/me. Не ответил — всё равно уходим на /login.
  logout: () => {
    set({ status: 'unauthenticated', user: null });
    void authApi
      .logout()
      .catch(() => undefined)
      .finally(() => {
        clearAllCookies();
        redirectToLogin();
      });
  },

  handleUnauthorized: () => {
    if (get().status === 'unauthenticated') {
      return;
    }

    set({ status: 'unauthenticated', user: null });
    redirectToLogin(window.location.pathname);
  },
}));

onUnauthorized(() => useAuthStore.getState().handleUnauthorized());
