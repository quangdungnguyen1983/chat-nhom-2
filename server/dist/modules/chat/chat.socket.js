// Handler message:send (09 mục 7.2, 7.3). Chỉ đọc payload → gọi service → ack.
import { z } from "zod";
import { AppError } from "../../common/errors.js";
import { M } from "../../common/messages.js";
import { log } from "../../common/logger.js";
import * as sessions from "../../storage/sessions.repo.js";
import * as chat from "./chat.service.js";
// Chế độ nghiêm: payload có trường lạ (vd senderId) → VALIDATION_ERROR, không lưu (09 mục 4.4).
const sendSchema = z.object({
    conversationId: z.number().int().positive(),
    content: z.string().max(20_000), // chặn chuỗi quá lớn trước khi chuẩn hóa; giới hạn thật 5000 ký tự ở service
    clientMessageId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
}).strict();
const fail = (code, message, retryable = false) => ({ ok: false, error: { code, message, retryable } });
export function registerChatHandlers(socket) {
    socket.on("message:send", async (payload, ack) => {
        if (typeof ack !== "function")
            return; // bắt buộc có ack
        const data = socket.data;
        try {
            // GL-04: kiểm tra lại phiên mỗi lần gửi tin.
            if (!(await sessions.findActiveById(data.sessionId, new Date()))) {
                ack(fail("UNAUTHENTICATED", M.M31));
                socket.disconnect(true);
                return;
            }
            const parsed = sendSchema.safeParse(payload);
            if (!parsed.success)
                return ack(fail("VALIDATION_ERROR", M.VALIDATION));
            const r = await chat.sendMessage(data.userId, parsed.data);
            ack({ ok: true, message: r.message, duplicate: r.duplicate });
        }
        catch (err) {
            if (err instanceof AppError)
                return ack(fail(err.code, err.message));
            log("error", `message:send lỗi: ${err instanceof Error ? err.name : "unknown"}`);
            ack(fail("INTERNAL", M.M34, true));
        }
    });
}
