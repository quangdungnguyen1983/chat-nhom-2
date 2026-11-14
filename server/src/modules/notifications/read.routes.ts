// C5 – TB-01
import { Router } from "express";
import { z } from "zod";
import { parseStrict } from "../../common/input.js";
import { validationError } from "../../common/errors.js";
import { requireAuth } from "../auth/session.middleware.js";
import { markRead } from "./unread.service.js";

export const readRouter = Router();

readRouter.post("/conversations/:id/read", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  if (!/^\d+$/.test(id) || id.length > 10) throw validationError({ id: "Mã không hợp lệ." });
  const body = parseStrict({ lastMessageId: z.number().int().nonnegative().optional() }, req.body);
  res.json(await markRead(req.auth!.userId, Number(id), body.lastMessageId));
});
