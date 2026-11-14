// Bảng mã lỗi (09-detailed-design.md mục 5) – phần dùng trong Vertical Slice 1.
import { M } from "./messages.js";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REGISTRATION_CODE"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ORIGIN"
  | "WRONG_CURRENT_PASSWORD"
  | "SAME_PASSWORD"
  | "NOT_FOUND"
  | "CANNOT_CHAT_SELF"
  | "USER_NOT_FOUND"
  | "CONVERSATION_FORBIDDEN"
  | "MESSAGE_EMPTY"
  | "MESSAGE_TOO_LONG"
  | "INTERNAL";

const table: Record<ErrorCode, { status: number; message: string }> = {
  VALIDATION_ERROR: { status: 400, message: M.VALIDATION },
  INVALID_REGISTRATION_CODE: { status: 400, message: M.M05 },
  USERNAME_TAKEN: { status: 409, message: M.M01 },
  INVALID_CREDENTIALS: { status: 401, message: M.M09 },
  UNAUTHENTICATED: { status: 401, message: M.M31 },
  FORBIDDEN_ORIGIN: { status: 403, message: M.M34 },
  WRONG_CURRENT_PASSWORD: { status: 400, message: M.M10 },
  SAME_PASSWORD: { status: 400, message: M.M11 },
  NOT_FOUND: { status: 404, message: "Không tìm thấy." },
  CANNOT_CHAT_SELF: { status: 400, message: M.M15 },
  USER_NOT_FOUND: { status: 404, message: M.M16 },
  // Người ngoài hội thoại HOẶC hội thoại không tồn tại → CÙNG một phản hồi 403 + M-30 (không lộ hội thoại nào có thật).
  // 09 GT-08 đề xuất 404; slice 2 dùng 403 theo yêu cầu review – xem PR.
  CONVERSATION_FORBIDDEN: { status: 403, message: M.M30 },
  MESSAGE_EMPTY: { status: 400, message: M.MESSAGE_EMPTY },
  MESSAGE_TOO_LONG: { status: 400, message: M.M17 },
  INTERNAL: { status: 500, message: M.M34 },
};

export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: FieldErrors;

  constructor(code: ErrorCode, fields?: FieldErrors, message?: string) {
    super(message ?? table[code].message);
    this.code = code;
    this.status = table[code].status;
    this.fields = fields && Object.keys(fields).length > 0 ? fields : undefined;
  }

  toBody() {
    return {
      error: { code: this.code, message: this.message, ...(this.fields ? { fields: this.fields } : {}) },
    };
  }
}

export function validationError(fields: FieldErrors, message: string = M.VALIDATION): AppError {
  return new AppError("VALIDATION_ERROR", fields, message);
}
