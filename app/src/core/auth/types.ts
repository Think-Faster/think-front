export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

// ПРЕДПОЛОЖЕНИЕ: точный контракт /api/auth/register не описан в
// docs/FRONTEND_INTEGRATION.md (там явно сказано, что регистрация — зона
// ответственности tf-auth, не BFF). Сделано по аналогии с LoginRequest —
// если у tf-auth другой набор полей, поменять нужно только этот тип и
// authApi.register (core/auth/authApi.ts), вызывается из одного места —
// features/users/hooks/useCreateUser.ts.
export interface RegisterRequest {
  userName: string;
  password: string;
}
