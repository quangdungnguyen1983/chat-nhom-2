// Kiểu dữ liệu trả ra API (09-detailed-design.md mục 6.2).
import { avatarInitial } from "./avatar.js";

export type UserDto = {
  id: number;
  username: string;
  displayName: string;
  avatarInitial: string;
};

export function toUserDto(u: { id: number; username: string; displayName: string }): UserDto {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarInitial: avatarInitial(u.displayName) };
}
