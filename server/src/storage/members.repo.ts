import { prisma, type Tx } from "./prisma.js";

/** Dòng thành viên HIỆN TẠI (left_at trống). Dùng duy nhất bởi chat/membership.ts. */
export function findActiveMember(conversationId: number, userId: number, tx?: Tx) {
  return (tx ?? prisma()).conversationMember.findFirst({ where: { conversationId, userId, leftAt: null } });
}

export async function activeConversationIds(userId: number): Promise<number[]> {
  const rows = await prisma().conversationMember.findMany({ where: { userId, leftAt: null }, select: { conversationId: true } });
  return rows.map((r) => r.conversationId);
}

export async function activeMemberIds(conversationId: number): Promise<number[]> {
  const rows = await prisma().conversationMember.findMany({ where: { conversationId, leftAt: null }, select: { userId: true } });
  return rows.map((r) => r.userId);
}
