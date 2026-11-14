import type { ReactNode } from "react";

/** Khi đang chờ máy chủ: khóa nút, hiện "Đang xử lý…" (FRS NT-05). */
export function SubmitButton({ busy, children, disabled }: { busy: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={busy || disabled} aria-busy={busy || undefined}>
      {busy ? <><span className="spinner" aria-hidden="true" /> Đang xử lý…</> : children}
    </button>
  );
}
