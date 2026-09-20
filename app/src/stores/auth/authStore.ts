import { create } from 'zustand';

import { authApi } from '../../core/auth/authApi';
import { onUnauthorized } from '../../core/auth/authEvents';
import { CurrentUser, LoginRequest } from '../../core/auth/types';
import { redirectToLogin } from '../../core/routing/navigation';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  initialize: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  handleUnauthorized: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,

  initialize: async () => {
    try {
      const user = await authApi.getCurrentUser();
      set({ status: 'authenticated', user });
    } catch {
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async request => {
    const user = await authApi.login(request);
    set({ status: 'authenticated', user });
  },

  logout: async () => {
    await authApi.logout();
    set({ status: 'unauthenticated', user: null });
    redirectToLogin();
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
