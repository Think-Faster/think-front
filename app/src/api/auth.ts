import api from './client';

export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export async function login(
  request: LoginRequest
): Promise<CurrentUser> {
  const response = await api.post<CurrentUser>(
    '/auth/login',
    request
  );

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>(
    '/auth/me'
  );

  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}