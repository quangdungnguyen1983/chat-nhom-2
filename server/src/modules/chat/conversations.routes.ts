// C1, C2, C3, C4 – chỉ đọc tham số → gọi service → trả kết quả.
import { Router } from "express";
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
