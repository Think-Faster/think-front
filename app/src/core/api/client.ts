import axios from 'axios';

import { config } from '../config/config';
import { emitUnauthorized } from '../auth/authEvents';

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      emitUnauthorized();
    }

    return Promise.reject(error);
  }
);
