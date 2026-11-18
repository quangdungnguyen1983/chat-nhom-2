// C1, C2, C3, C4 – chỉ đọc tham số → gọi service → trả kết quả.
import express, { Router } from "express";
import { AppError } from "../../common/errors.js";
import { MAX_FILE_BYTES } from "../../common/attachments.js";
import { z } from "zod";
import { parseStrict } from "../../common/input.js";
import { validationError } from "../../common/errors.js";
import { requireAuth } from "../auth/session.middleware.js";
import * as chat from "./chat.service.js";

const positiveInt = z.coerce.number().int().positive().max(2_147_483_647);
const idParam = (raw: unknown, name = "id") => {
  const r = positiveInt.safeParse(raw);
  if (!r.success || !/^\d+$/.test(String(raw))) throw validationError({ [name]: "Mã không hợp lệ." });
  return r.data;
};

export const conversationsRouter = Router();
conversationsRouter.use("/conversations", requireAuth);

// C1 – CH-01
conversationsRouter.post("/conversations/direct", async (req, res) => {
  const body = parseStrict({ userId: z.number().int().positive() }, req.body);
  const r = await chat.openDirect(req.auth!.userId, body.userId);
  res.status(r.created ? 201 : 200).json({ conversation: r.conversation });
});

// C2 – CH-06, TB-01
conversationsRouter.get("/conversations", async (req, res) => {
  res.json(await chat.listConversations(req.auth!.userId));
});

// C3
conversationsRouter.get("/conversations/:id", async (req, res) => {
  res.json({ conversation: await chat.getConversation(req.auth!.userId, idParam(req.params.id)) });
});

// C4 – CH-03
conversationsRouter.get("/conversations/:id/messages", async (req, res) => {
  const id = idParam(req.params.id);
  const q = parseStrict(
    { before: z.string().optional(), after: z.string().optional(), limit: z.string().optional() },
    req.query,
  );
  res.json(await chat.getMessages(req.auth!.userId, id, {
    before: q.before !== undefined ? idParam(q.before, "before") : undefined,
    after: q.after !== undefined ? idParam(q.after, "after") : undefined,
    limit: q.limit !== undefined ? idParam(q.limit, "limit") : undefined,
  }));
});

// C7 – Gửi tệp đính kèm (2026-11-18). Thân yêu cầu là nội dung tệp (application/octet-stream);
// tên tệp và chú thích nằm ở header, mã hóa bằng encodeURIComponent.
const rawFile = express.raw({ type: "application/octet-stream", limit: MAX_FILE_BYTES });
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const decodeHeader = (v: string | undefined) => {
  if (v === undefined) return undefined;
  try { return decodeURIComponent(v); } catch { throw validationError({ header: "Header không hợp lệ." }); }
};

conversationsRouter.post("/conversations/:id/attachments", (req, res, next) => {
  rawFile(req, res, (err?: unknown) => {
    if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.too.large") return next(new AppError("FILE_TOO_LARGE"));
    next(err);
  });
}, async (req, res) => {
  const id = idParam(req.params.id);
  if (!Buffer.isBuffer(req.body)) throw validationError({ file: "Cần gửi nội dung tệp dạng application/octet-stream." });
  const clientMessageId = req.get("x-client-message-id") ?? "";
  if (!uuidV4.test(clientMessageId)) throw validationError({ clientMessageId: "Mã tạm không hợp lệ." });
  const r = await chat.sendFile(req.auth!.userId, {
    conversationId: id, clientMessageId,
    fileName: decodeHeader(req.get("x-file-name")) ?? "",
    caption: decodeHeader(req.get("x-caption")),
    data: new Uint8Array(req.body.buffer, req.body.byteOffset, req.body.byteLength),
  });
  res.status(r.duplicate ? 200 : 201).json({ message: r.message, duplicate: r.duplicate });
});

// C8 – Tải tệp đính kèm. Ảnh hiển thị ngay (inline), loại khác luôn tải về (attachment).
export const attachmentsRouter = Router();
attachmentsRouter.use("/attachments", requireAuth);
attachmentsRouter.get("/attachments/:id", async (req, res) => {
  const f = await chat.getAttachment(req.auth!.userId, idParam(req.params.id));
  const ascii = f.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  res.set({
    "Content-Type": f.mimeType,
    "Content-Length": String(f.data.byteLength),
    "Content-Disposition": `${f.isImage ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
    "Cache-Control": "private, max-age=3600",
    // Không cho nội dung tệp chạy script dù trình duyệt có đoán sai loại.
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  });
  res.end(Buffer.from(f.data));
});
