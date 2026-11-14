// SCR-07 / SC-07 – Hồ sơ (TK-05) + Đăng xuất (TK-03) + mở SCR-08 Đổi mật khẩu (TK-04)
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { updateMe } from "../api/users";
import { Avatar } from "../components/Avatar";
import { Field } from "../components/Field";
import { SubmitButton } from "../components/SubmitButton";
import { useAuth } from "../auth";
import { M, checkDisplayName, nfc } from "../lib/text";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function ProfilePage() {
  const { user, setUser, signOut } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const pwBtn = useRef<HTMLButtonElement>(null);
  const nav = useNavigate();
  if (!user) return null;

  const changed = nfc(name).trim() !== user.displayName;

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setOk(null);
    const e = checkDisplayName(name);
    if (e) return setError(e);
    setBusy(true);
    try {
      const r = await updateMe(name);
      setUser(r.user);
      setName(r.user.displayName);
      setError(null);
      setOk(M.M42);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.fields?.displayName ?? err.body.message : M.M34);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    await signOut();
    nav("/dang-nhap", { replace: true });
  }

  return (
    <main className="auth-page">
      <div className="card">
        <p><Link to="/">← Quay lại</Link></p>
        <h1>Hồ sơ</h1>
        <div className="profile-head">
          <Avatar user={user} size={64} />
          <div>
            <div className="name">{user.displayName}</div>
            <div className="sub">@{user.username}</div>
          </div>
        </div>
        <form onSubmit={save} noValidate>
          <Field label="Tên đăng nhập" value={user.username} readOnly disabled />
          <Field label="Tên hiển thị" value={name} onChange={(e) => { setName(e.target.value); setOk(null); }} error={error} autoComplete="name" />
          {ok && <div role="status" className="alert alert-success">{ok}</div>}
          <SubmitButton busy={busy} disabled={!changed}>Lưu</SubmitButton>
        </form>
        <div className="actions">
          <button ref={pwBtn} type="button" className="btn btn-secondary" onClick={() => setPwOpen(true)}>Đổi mật khẩu</button>
          <button type="button" className="btn btn-secondary" onClick={doLogout}>Đăng xuất</button>
        </div>
      </div>
      {pwOpen && <ChangePasswordDialog onClose={() => { setPwOpen(false); pwBtn.current?.focus(); }} onSuccess={() => setOk(M.M41)} />}
    </main>
  );
}
