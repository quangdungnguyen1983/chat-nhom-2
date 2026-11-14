// SCR-01 / SC-01 – Đăng ký (TK-01, TK-02)
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import * as authApi from "../api/auth";
import { Field, SelectField } from "../components/Field";
import { PasswordChecklist } from "../components/PasswordChecklist";
import { SubmitButton } from "../components/SubmitButton";
import { useAuth } from "../auth";
import { M, checkDisplayName, checkPassword, checkUsername, normalizeUsername } from "../lib/text";

type Form = { username: string; displayName: string; password: string; passwordConfirm: string; registrationCode: string };
type Errors = Partial<Record<keyof Form | "_form", string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  const u = checkUsername(f.username); if (u) e.username = u;
  const d = checkDisplayName(f.displayName); if (d) e.displayName = d;
  const p = checkPassword(f.password); if (p) e.password = p;
  if (!p && f.passwordConfirm !== f.password) e.passwordConfirm = M.M04;
  if (!f.registrationCode.trim()) e.registrationCode = M.M05;
  return e;
}

export function RegisterPage() {
  const [f, setF] = useState<Form>({ username: "", displayName: "", password: "", passwordConfirm: "", registrationCode: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { setNotice } = useAuth();
  // Danh mục mã đăng ký tổ chức lấy từ máy chủ (mã không nằm trong mã nguồn giao diện).
  const [orgs, setOrgs] = useState<authApi.RegistrationOption[] | null>(null);
  const [orgsError, setOrgsError] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    authApi.registrationOptions()
      .then((r) => {
        if (!alive) return;
        setOrgs(r.options);
        // Chỉ có một tổ chức → chọn sẵn, người dùng không phải làm gì thêm.
        if (r.options.length === 1) setF((prev) => (prev.registrationCode ? prev : { ...prev, registrationCode: r.options[0].code }));
      })
      .catch(() => { if (alive) { setOrgs([]); setOrgsError(M.M34); } });
    return () => { alive = false; };
  }, []);

  const set = (k: keyof Form) => (ev: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: ev.target.value });
  const blur = (k: keyof Form) => () => {
    const all = validate(f);
    setErrors((prev) => ({ ...prev, [k]: f[k] ? all[k] : prev[k] }));
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await authApi.register(f);
      setNotice(M.M40);
      nav("/dang-nhap", { state: { username: r.user.username } });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ ...(err.body.fields as Errors | undefined), ...(err.body.fields ? {} : { _form: err.body.message }) });
      } else setErrors({ _form: M.M34 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="card" onSubmit={submit} noValidate>
        <h1>Tạo tài khoản</h1>
        {errors._form && <div role="alert" className="alert alert-error">{errors._form}</div>}
        <Field label="Tên đăng nhập" value={f.username} onChange={set("username")} onBlur={blur("username")} placeholder="vd: an.nguyen"
          hint="3–30 ký tự: a–z, 0–9, dấu chấm, gạch dưới" error={errors.username} autoComplete="username" autoCapitalize="none" maxLength={60} />
        <Field label="Tên hiển thị" value={f.displayName} onChange={set("displayName")} onBlur={blur("displayName")} placeholder="vd: Nguyễn Văn An"
          error={errors.displayName} autoComplete="name" />
        <Field label="Mật khẩu" password value={f.password} onChange={set("password")} onBlur={blur("password")} error={errors.password} autoComplete="new-password" />
        <PasswordChecklist value={f.password} />
        <Field label="Nhập lại mật khẩu" password value={f.passwordConfirm} onChange={set("passwordConfirm")} onBlur={blur("passwordConfirm")}
          error={errors.passwordConfirm} autoComplete="new-password" />
        <SelectField label="Mã đăng ký tổ chức" value={f.registrationCode}
          onChange={(ev) => setF({ ...f, registrationCode: ev.target.value })}
          placeholder={orgs === null ? "Đang tải…" : "— Chọn tổ chức —"} disabled={orgs === null}
          options={(orgs ?? []).map((o) => ({ value: o.code, label: `${o.label} (${o.code})` }))}
          error={errors.registrationCode ?? orgsError} />
        <SubmitButton busy={busy}>Đăng ký</SubmitButton>
        <p className="switch"><Link to="/dang-nhap" state={{ username: normalizeUsername(f.username) }}>Đã có tài khoản? Đăng nhập</Link></p>
      </form>
    </main>
  );
}
