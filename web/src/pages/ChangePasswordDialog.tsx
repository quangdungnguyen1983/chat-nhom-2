// SCR-08 / SC-08 – Hộp thoại đổi mật khẩu (TK-04)
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import * as authApi from "../api/auth";
import { Field } from "../components/Field";
import { PasswordChecklist } from "../components/PasswordChecklist";
import { SubmitButton } from "../components/SubmitButton";
import { M, checkPassword } from "../lib/text";

type Form = { currentPassword: string; newPassword: string; newPasswordConfirm: string };
type Errors = Partial<Record<keyof Form | "_form", string>>;

export function ChangePasswordDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [f, setF] = useState<Form>({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector("input")?.focus(); // focus ô đầu tiên khi mở
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof Form) => (ev: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: ev.target.value });

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e: Errors = {};
    if (!f.currentPassword) e.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    const p = checkPassword(f.newPassword); if (p) e.newPassword = p;
    if (!p && f.newPasswordConfirm !== f.newPassword) e.newPasswordConfirm = M.M04;
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await authApi.changePassword(f);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.body.fields ? (err.body.fields as Errors) : { _form: err.body.message });
      else setErrors({ _form: M.M34 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title" ref={ref}>
        <form onSubmit={submit} noValidate>
          <h2 id="pw-title">Đổi mật khẩu</h2>
          {errors._form && <div role="alert" className="alert alert-error">{errors._form}</div>}
          <Field label="Mật khẩu hiện tại" password value={f.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} autoComplete="current-password" />
          <Field label="Mật khẩu mới" password value={f.newPassword} onChange={set("newPassword")} error={errors.newPassword} autoComplete="new-password" />
          <PasswordChecklist value={f.newPassword} />
          <Field label="Nhập lại mật khẩu mới" password value={f.newPasswordConfirm} onChange={set("newPasswordConfirm")} error={errors.newPasswordConfirm} autoComplete="new-password" />
          <div className="actions">
            <SubmitButton busy={busy}>Đổi mật khẩu</SubmitButton>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
