export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type LoginValues = {
  email: string;
  password: string;
};

export type RegisterValues = LoginValues & {
  name?: string;
};
