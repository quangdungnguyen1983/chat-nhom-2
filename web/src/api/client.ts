// fetch với credentials "same-origin": cookie HttpOnly tự đi kèm, mã JS không đọc được token (ADR-02).
export type UserDto = { id: number; username: string; displayName: string; avatarInitial: string };
export type ApiErrorBody = { code: string; message: string; fields?: Record<string, string> };

export class ApiError extends Error {
  constructor(readonly status: number, readonly body: ApiErrorBody) {
    super(body.message);
  }
}

const CONNECTION_ERROR: ApiErrorBody = { code: "NETWORK", message: "Không kết nối được máy chủ. Vui lòng thử lại." };

let onUnauthorized: (() => void) | null = null;
/** App đăng ký: 401 ở yêu cầu cần phiên → hiện M-31 và về đăng nhập (FRS NT-07). */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function api<T>(method: string, url: string, body?: unknown, opts: { authRequired?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, CONNECTION_ERROR);
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* phản hồi không phải JSON */
  }
  if (!res.ok) {
    const err = (data as { error?: ApiErrorBody } | null)?.error ?? CONNECTION_ERROR;
    if (res.status === 401 && err.code === "UNAUTHENTICATED" && opts.authRequired !== false) onUnauthorized?.();
    throw new ApiError(res.status, err);
  }
  return data as T;
}
