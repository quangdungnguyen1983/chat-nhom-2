// /api/me và /api/users (U1, U2, U3).
import { Router } from "express";
import { z } from "zod";
import { parseStrict, str } from "../../common/input.js";
import { requireAuth } from "../auth/session.middleware.js";
import * as svc from "./users.service.js";

export const usersRouter = Router();

// U1 – TK-05, TK-03: giao diện gọi khi tải lại trang để biết còn phiên không
usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await svc.getMe(req.auth!.userId);
  res.json({ user, session: { expiresAt: req.auth!.expiresAt.toISOString() } });
});

// U2 – TK-05
usersRouter.put("/me", requireAuth, async (req, res) => {
  const body = parseStrict({ displayName: str() }, req.body);
  res.json({ user: await svc.updateDisplayName(req.auth!.userId, body.displayName) });
});

// U3 – TK-06. `excludeConversationId`: loại thành viên hiện tại của nhóm (SCR-06a); người gọi không phải
// thành viên thì bỏ qua tham số (09 U3).
usersRouter.get("/users", requireAuth, async (req, res) => {
  const query = parseStrict({ q: str(), excludeConversationId: z.string().regex(/^\d+$/).optional() }, req.query);
  const ex = query.excludeConversationId !== undefined ? Number(query.excludeConversationId) : undefined;
  res.json({ users: await svc.searchUsers(req.auth!.userId, query.q, ex !== undefined && ex <= 2_147_483_647 ? ex : undefined) });
});
