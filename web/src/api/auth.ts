import { api, type UserDto } from "./client";

type SessionInfo = { expiresAt: string };

export const register = (body: { username: string; password: string; passwordConfirm: string; displayName: string; registrationCode: string }) =>
  api<{ user: UserDto }>("POST", "/api/auth/register", body, { authRequired: false });

export type RegistrationOption = { label: string; code: string };
export const registrationOptions = () =>
  api<{ options: RegistrationOption[] }>("GET", "/api/auth/registration-options", undefined, { authRequired: false });

export const login = (username: string, password: string) =>
  api<{ user: UserDto; session: SessionInfo }>("POST", "/api/auth/login", { username, password }, { authRequired: false });

export const logout = () => api<void>("POST", "/api/auth/logout", undefined, { authRequired: false });

export const changePassword = (body: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) =>
  api<void>("PUT", "/api/me/password", body);
