export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}
