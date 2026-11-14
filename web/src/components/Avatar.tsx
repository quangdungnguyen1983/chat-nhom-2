import type { UserDto } from "../api/client";
import { avatarColorVar } from "../lib/text";

export function Avatar({ user, size = 40 }: { user: Pick<UserDto, "id" | "avatarInitial">; size?: number }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ background: avatarColorVar(user.id), width: size, height: size, fontSize: size * 0.45 }}>
      {user.avatarInitial}
    </span>
  );
}
