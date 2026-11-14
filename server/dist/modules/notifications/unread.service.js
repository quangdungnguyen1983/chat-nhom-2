// TB-01: báo đã đọc (09 mục 10.5).
import { withWriteTx } from "../../storage/prisma.js";
import * as convRepo from "../../storage/conversations.repo.js";
import { advanceCursor, unreadCounts } from "../../storage/unread.repo.js";
import * as members from "../../storage/members.repo.js";
import { assertActiveMember } from "../chat/membership.js";
import * as realtime from "./realtime.js";
export async function markRead(me, conversationId, lastMessageId) {
    await assertActiveMember(conversationId, me);
    const lastReadMessageId = await withWriteTx(async (tx) => {
        const latest = (await convRepo.lastMessageId(conversationId))?.lastMessageId ?? 0;
        const target = Math.min(lastMessageId ?? latest, latest); // không vượt tin mới nhất
        return advanceCursor(tx, conversationId, me, target); // không lùi
    });
    const unreadCount = (await unreadCounts(me, [conversationId])).get(conversationId) ?? 0;
    realtime.emitUnread(me, conversationId, unreadCount, lastReadMessageId); // đồng bộ các tab khác (TB-01-AC3)
    const ids = await members.activeConversationIds(me);
    const all = await unreadCounts(me, ids);
    const totalUnread = [...all.values()].reduce((s, n) => s + n, 0);
    return { conversationId, lastReadMessageId, unreadCount, totalUnread };
}
