// Ghi log tối giản. KHÔNG truyền mật khẩu, token, nội dung tin vào đây.
type Level = "error" | "info" | "debug";
const order: Record<string, number> = { silent: 0, error: 1, info: 2, debug: 3 };

export function log(level: Level, msg: string): void {
  const current = process.env.LOG_LEVEL ?? "info";
  if ((order[level] ?? 2) > (order[current] ?? 2)) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${msg}`;
  if (level === "error") console.error(line);
  else console.log(line);
}
