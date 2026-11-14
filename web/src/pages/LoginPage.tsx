// SCR-02 / SC-02 – Đăng nhập (TK-03)
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import * as authApi from "../api/auth";
import { Field } from "../components/Field";
import { SubmitButton } from "../components/SubmitButton";
import { useAuth } from "../auth";
import { M } from "../lib/text";

export function LoginPage() {
  const loc = useLocation();
  const { notice, signIn } = useAuth();
  const [username, setUsername] = useState<string>((loc.state as { username?: string } | null)?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!username.trim() || !password) return setError(M.M35);
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.login(username, password);
      signIn(r.user);
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : M.M34);
    } finally {
      setBusy(false);
    }
  }

  const isSuccess = notice === M.M40;
  return (
    <main className="auth-page">
      <form className="card" onSubmit={submit} noValidate>
        <h1>Đăng nhập</h1>
        {notice && !error && (
          <div role={isSuccess ? "status" : "alert"} className={isSuccess ? "alert alert-success" : "alert alert-error"}>{notice}</div>
        )}
        <Field label="Tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" />
        <Field label="Mật khẩu" password value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        <SubmitButton busy={busy}>Đăng nhập</SubmitButton>
        <p className="switch"><Link to="/dang-ky">Chưa có tài khoản? Đăng ký</Link></p>
      </form>
    </main>
  );
}
