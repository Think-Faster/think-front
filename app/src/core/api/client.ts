import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { config } from '../config/config';
import { emitUnauthorized } from '../auth/authEvents';
import { endpoints } from './endpoints';

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Access-токен живёт 10 минут, сессия (refresh-токен) — сутки. BFF продлевает токен сам, а воронка —
// нет: на 401 один раз продлеваем сессию через /auth/refresh и повторяем запрос. На вход — только
// если продлить не удалось. Ручки входа и самого продления не продлеваем: их 401 — окончательный.
const noRefresh = new Set<string>([endpoints.auth.login, endpoints.auth.register, endpoints.auth.me, endpoints.auth.refresh]);
const retried = new WeakSet<AxiosRequestConfig>();

// Одно продление на все запросы, упавшие разом.
let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = apiClient
      .post(endpoints.auth.refresh)
      .then(
        () => true,
        () => false
      )
      .finally(() => {
        refreshing = null;
      });
  }

  return refreshing;
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const request = error.config;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (!request || noRefresh.has(request.url ?? '') || retried.has(request)) {
      emitUnauthorized();
      return Promise.reject(error);
    }

    retried.add(request);

    if (await refreshSession()) {
      return apiClient(request);
    }

    emitUnauthorized();
    return Promise.reject(error);
  }
);
