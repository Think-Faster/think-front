import axios from 'axios';

export type ErrorKind =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'rateLimited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface ClassifiedError {
  kind: ErrorKind;
  status?: number;
}

export function classifyError(error: unknown): ClassifiedError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'unknown' };
  }

  if (error.code === 'ECONNABORTED') {
    return { kind: 'timeout' };
  }

  if (!error.response) {
    return { kind: 'network' };
  }

  const status = error.response.status;

  switch (status) {
    case 400:
      return { kind: 'badRequest', status };
    case 401:
      return { kind: 'unauthorized', status };
    case 403:
      return { kind: 'forbidden', status };
    case 404:
      return { kind: 'notFound', status };
    case 409:
      return { kind: 'conflict', status };
    case 422:
      return { kind: 'validation', status };
    case 429:
      return { kind: 'rateLimited', status };
    default:
      return { kind: status >= 500 ? 'server' : 'unknown', status };
  }
}
