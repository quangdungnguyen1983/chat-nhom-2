// G1–G5 (09 mục 6.3). Chỉ đọc tham số → gọi service → trả kết quả. Người thực hiện luôn là req.auth.userId.
import { Router } from "express";
import { z } from "zod";
import { parseStrict } from "../../common/input.js";
import { validationError } from "../../common/errors.js";
import { requireAuth } from "../auth/session.middleware.js";
import * as svc from "./groups.service.js";
const id = (raw, field = "id") => {
    const s = String(raw);
    if (!/^\d{1,10}$/.test(s) || Number(s) < 1 || Number(s) > 2_147_483_647)
        throw validationError({ [field]: "Mã không hợp lệ." });
    return Number(s);
};
const userId = z.number().int().positive().max(2_147_483_647);
export const groupsRouter = Router();
// G1 – NH-01, NH-04
groupsRouter.post("/conversations/group", requireAuth, async (req, res) => {
    const body = parseStrict({ name: z.string().max(1000), memberIds: z.array(userId).max(500) }, req.body);
    res.status(201).json({ conversation: await svc.createGroup(req.auth.userId, body.name, body.memberIds) });
});
// G2 – NH-03, NH-04
groupsRouter.patch("/conversations/:id", requireAuth, async (req, res) => {
    const body = parseStrict({ name: z.string().max(1000) }, req.body);
    res.json({ conversation: await svc.renameGroup(req.auth.userId, id(req.params.id), body.name) });
});
// G3 – NH-03, NH-04
groupsRouter.post("/conversations/:id/members", requireAuth, async (req, res) => {
    const body = parseStrict({ userIds: z.array(userId).max(500), showHistory: z.boolean().optional() }, req.body);
    const conversation = await svc.addMembers(req.auth.userId, id(req.params.id), body.userIds, body.showHistory ?? false);
    res.status(201).json({ conversation });
});
// G4 – NH-03, NH-04
groupsRouter.delete("/conversations/:id/members/:userId", requireAuth, async (req, res) => {
    await svc.removeMember(req.auth.userId, id(req.params.id), id(req.params.userId, "userId"));
    res.status(204).end();
});
// G5 – NH-03, NH-04
groupsRouter.post("/conversations/:id/leave", requireAuth, async (req, res) => {
    const body = parseStrict({ newOwnerId: userId.optional() }, req.body);
    await svc.leaveGroup(req.auth.userId, id(req.params.id), body.newOwnerId);
    res.status(204).end();
});
