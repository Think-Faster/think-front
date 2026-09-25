import axios from 'axios';

export type BffErrorCode =
  | 'unauthenticated'
  | 'invalid_token'
  | 'token_refresh_failed'
  | 'auth_service_unavailable'
  | 'user_not_provisioned'
  | 'user_inactive'
  | 'permission_denied'
  | 'not_found'
  | 'cycle_detected'
  | 'duplicate_code'
  | 'system_group_protected'
  | 'validation_failed'
  | 'bad_request'
  | 'internal_error'
  // "кто первый взял — тот ведёт": штатный исход гонки на
  // POST /tasks/{id}/take, не ошибка данных — см.
  // docs/FRONTEND_INTEGRATION_DOMAIN_MODELS.md §3.
  | 'task_already_taken'
  | 'unknown';

export interface BffError {
  code: BffErrorCode;
  message: string;
  details: Record<string, string[]> | null;
  status?: number;
}

// BFF (docs/FRONTEND_INTEGRATION.md §3) always answers errors as
// { code, message, details }. This reads that shape directly instead of
// guessing from the HTTP status the way core/errors/httpError.ts does —
// use this one for any call that goes through the BFF.
export function parseBffError(error: unknown): BffError {
  if (axios.isAxiosError(error) && error.response) {
    const body = error.response.data as Partial<BffError> | undefined;

    if (body?.code) {
      return {
        code: body.code as BffErrorCode,
        message: body.message ?? '',
        details: body.details ?? null,
        status: error.response.status,
      };
    }

    return { code: 'unknown', message: error.message, details: null, status: error.response.status };
  }

  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unknown error',
    details: null,
  };
}

export function formatBffErrorMessage(error: unknown, fallback: string): string {
  const parsed = parseBffError(error);

  if (parsed.details) {
    return Object.entries(parsed.details)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');
  }

  return parsed.message || fallback;
}
