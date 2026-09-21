import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { CurrentUser, LoginRequest, RegisterRequest } from './types';

export const authApi = {
  async login(request: LoginRequest): Promise<CurrentUser> {
    const response = await apiClient.post<CurrentUser>(
      endpoints.auth.login,
      request
    );

    return response.data;
  },

  async register(request: RegisterRequest): Promise<CurrentUser> {
    const response = await apiClient.post<CurrentUser>(
      endpoints.auth.register,
      request
    );

    return response.data;
  },

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await apiClient.get<CurrentUser>(endpoints.auth.me);
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(endpoints.auth.logout);
  },
};
