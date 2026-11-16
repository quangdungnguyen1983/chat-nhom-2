// Nghiệp vụ tài khoản: TK-01, TK-02, TK-03, TK-04. Không import express (08 mục 4.3).
import { AppError, validationError, type FieldErrors } from "../../common/errors.js";
import { M } from "../../common/messages.js";
import {
  checkDisplayName, checkPassword, checkUsername, normalizeDisplayName, normalizePassword,
  normalizeUsername, searchKey,
} from "../../common/validation.js";
import { toUserDto, type UserDto } from "../../common/dto.js";
import * as users from "../../storage/users.repo.js";
import * as sessions from "../../storage/sessions.repo.js";
import { isUniqueViolation, withWriteTx } from "../../storage/prisma.js";
import { getDummyHash, hashPassword, verifyPassword } from "./password.js";
import { createSession, revoke, type AuthContext } from "./session.service.js";
import { disconnectSession } from "../notifications/realtime.js";

export type RegisterInput = {
  username: string; password: string; passwordConfirm: string; displayName: string;
};

export async function register(input: RegisterInput): Promise<UserDto> {
  // 1) Định dạng các trường.
  const username = normalizeUsername(input.username);
  const displayName = normalizeDisplayName(input.displayName);
  const password = normalizePassword(input.password);
  const confirm = normalizePassword(input.passwordConfirm);
  const fields: FieldErrors = {};
  const u = checkUsername(username); if (u) fields.username = u;
  const d = checkDisplayName(displayName); if (d) fields.displayName = d;
  const p = checkPassword(password); if (p) fields.password = p;
  if (!p && confirm !== password) fields.passwordConfirm = M.M04;
  if (Object.keys(fields).length) throw validationError(fields);

  // 2) Trùng tên: kiểm tra trước, vẫn bắt lỗi UNIQUE của CSDL khi hai người đăng ký cùng lúc.
  if (await users.findByUsername(username)) throw new AppError("USERNAME_TAKEN", { username: M.M01 });
  const passwordHash = await hashPassword(password);
  try {
    const row = await users.createUser({ username, passwordHash, displayName, displayNameSearch: searchKey(displayName) });
    return toUserDto(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("USERNAME_TAKEN", { username: M.M01 });
    throw err;
  }
}

export async function login(usernameRaw: string, passwordRaw: string, ttlHours: number) {
  const username = normalizeUsername(usernameRaw);
  const password = normalizePassword(passwordRaw);
  if (!username || !password) throw validationError({ username: M.M35, password: M.M35 }, M.M35);

  const user = await users.findByUsername(username);
  if (!user) {
    await verifyPassword(await getDummyHash(), password); // thời gian tương đương, rồi báo lỗi CHUNG (TK-03 R5)
    throw new AppError("INVALID_CREDENTIALS");
  }
  if (!(await verifyPassword(user.passwordHash, password))) throw new AppError("INVALID_CREDENTIALS");

  const s = await createSession(user.id, ttlHours);
  return { user: toUserDto(user), token: s.token, expiresAt: s.expiresAt };
}

export async function logout(auth: AuthContext): Promise<void> {
  await revoke(auth.sessionId, "logout");
}

export type ChangePasswordInput = { currentPassword: string; newPassword: string; newPasswordConfirm: string };

/** TK-04: đổi mật khẩu, giữ phiên hiện tại, hủy MỌI phiên khác (QĐ-09 / GS-09). Trả id các phiên bị hủy. */
export async function changePassword(auth: AuthContext, input: ChangePasswordInput): Promise<number[]> {
  const user = await users.findById(auth.userId);
  if (!user) throw new AppError("UNAUTHENTICATED");

  const current = normalizePassword(input.currentPassword);
  const next = normalizePassword(input.newPassword);
  const confirm = normalizePassword(input.newPasswordConfirm);

  if (!(await verifyPassword(user.passwordHash, current))) {
    throw new AppError("WRONG_CURRENT_PASSWORD", { currentPassword: M.M10 });
  }
  const p = checkPassword(next);
  if (p) throw validationError({ newPassword: p });
  if (confirm !== next) throw validationError({ newPasswordConfirm: M.M04 });
  if (next === current) throw new AppError("SAME_PASSWORD", { newPassword: M.M11 });

  const newHash = await hashPassword(next);
  const now = new Date();
  const revoked = await withWriteTx(async (tx) => {
    await users.updatePasswordHash(user.id, newHash, tx);
    return sessions.revokeOtherSessions(user.id, auth.sessionId, "password_change", now, tx);
  });
  // Sau giao dịch: báo + ngắt socket của từng phiên bị hủy (QĐ-09, TK-03 R4).
  for (const id of revoked) disconnectSession(id, "password_change");
  return revoked;
}
