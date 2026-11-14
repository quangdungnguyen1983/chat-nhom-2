import { api, type UserDto } from "./client";
import type { ConversationSummaryDto } from "./chat";

export type ConversationDetailDto = ConversationSummaryDto & {
  name: string | null;
  members: Array<{ user: UserDto; role: "owner" | "member" }>;
};

export const getConversation = (id: number) => api<{ conversation: ConversationDetailDto }>("GET", `/api/conversations/${id}`);
export const createGroup = (name: string, memberIds: number[]) =>
  api<{ conversation: ConversationDetailDto }>("POST", "/api/conversations/group", { name, memberIds });
export const renameGroup = (id: number, name: string) =>
  api<{ conversation: ConversationDetailDto }>("PATCH", `/api/conversations/${id}`, { name });
export const addMembers = (id: number, userIds: number[], showHistory: boolean) =>
  api<{ conversation: ConversationDetailDto }>("POST", `/api/conversations/${id}/members`, { userIds, showHistory });
export const removeMember = (id: number, userId: number) => api<void>("DELETE", `/api/conversations/${id}/members/${userId}`);
export const leaveGroup = (id: number, newOwnerId?: number) =>
  api<void>("POST", `/api/conversations/${id}/leave`, newOwnerId ? { newOwnerId } : {});
