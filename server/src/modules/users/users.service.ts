// TK-05 (hồ sơ) và TK-06 (tìm người dùng). Không import express.
import { AppError, validationError } from "../../common/errors.js";
import { toUserDto, type UserDto } from "../../common/dto.js";
import { checkDisplayName, countChars, escapeLike, normalizeDisplayName, searchKey } from "../../common/validation.js";
import * as users from "../../storage/users.repo.js";

export const SEARCH_LIMIT = 20; // GS-14
export const SEARCH_MAX_CHARS = 50; // GT-09

export async function getMe(userId: number): Promise<UserDto> {
  const u = await users.findById(userId);
  if (!u) throw new AppError("UNAUTHENTICATED");
  return toUserDto(u);
}

export async function updateDisplayName(userId: number, raw: string): Promise<UserDto> {
  const displayName = normalizeDisplayName(raw);
  const err = checkDisplayName(displayName);
  if (err) throw validationError({ displayName: err }); // E-TK05-1, giữ tên cũ
  const u = await users.updateDisplayName(userId, displayName, searchKey(displayName));
  return toUserDto(u);
}

export async function searchUsers(requesterId: number, q: string): Promise<UserDto[]> {
  const key = searchKey(q);
  const n = countChars(key);
  if (n < 1 || n > SEARCH_MAX_CHARS) throw validationError({ q: "Vui lòng nhập từ khóa (1–50 ký tự)." });
  const rows = await users.searchUsers(`%${escapeLike(key)}%`, requesterId, SEARCH_LIMIT);
  return rows.map(toUserDto);
}
