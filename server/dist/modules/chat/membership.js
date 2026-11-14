// Cửa G2 DUY NHẤT (09 mục 2.2 quy tắc 4, mục 10.8).
// Không phải thành viên hiện tại – KỂ CẢ khi hội thoại không tồn tại – đều nhận cùng một lỗi
// CONVERSATION_FORBIDDEN (403, M-30), để không lộ hội thoại nào có thật (NFR-04).
import { AppError } from "../../common/errors.js";
import * as members from "../../storage/members.repo.js";
export async function assertActiveMember(conversationId, userId, tx) {
    const m = await members.findActiveMember(conversationId, userId, tx);
    if (!m)
        throw new AppError("CONVERSATION_FORBIDDEN");
    return m;
}
