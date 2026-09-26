export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

// Создание учётной записи в сервисе аутентификации — POST /auth/users/create
// (endpoints.auth.register). email обязателен. Если поля запроса ещё
// изменятся, менять нужно только этот тип и authApi.register
// (core/auth/authApi.ts) — вызывается из одного места,
// features/users/hooks/useCreateUser.ts.
export interface RegisterRequest {
  userName: string;
  password: string;
  email: string;
}
