export interface AuthUser {
  id: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
}
