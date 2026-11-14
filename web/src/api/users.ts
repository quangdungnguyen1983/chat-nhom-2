import { api, type UserDto } from "./client";

/** Khi tải lại trang: còn phiên hay không (09 mục 8.4). Không kích hoạt "hết phiên". */
export const getMe = () => api<{ user: UserDto; session: { expiresAt: string } }>("GET", "/api/me", undefined, { authRequired: false });

export const updateMe = (displayName: string) => api<{ user: UserDto }>("PUT", "/api/me", { displayName });

export const searchUsers = (q: string, excludeConversationId?: number) =>
  api<{ users: UserDto[] }>("GET", `/api/users?q=${encodeURIComponent(q)}${excludeConversationId ? `&excludeConversationId=${excludeConversationId}` : ""}`);
