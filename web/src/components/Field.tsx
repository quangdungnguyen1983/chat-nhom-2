import { useId, useState, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string; password?: boolean };

/** Ô nhập có <label> thật, lỗi nối bằng aria-describedby (10-ui-ux.md mục 10). */
export function Field({ label, error, hint, password, id, ...rest }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const [show, setShow] = useState(false);
  const describedBy = [hint ? `${inputId}-hint` : null, error ? `${inputId}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="input-wrap">
        <input
          id={inputId}
          {...rest}
          type={password ? (show ? "text" : "password") : rest.type ?? "text"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={error ? "invalid" : undefined}
        />
        {password && (
          <button type="button" className="toggle-pw" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShow((s) => !s)}>
            {show ? "Ẩn" : "Hiện"}
          </button>
        )}
      </div>
      {hint && <p id={`${inputId}-hint`} className="hint">{hint}</p>}
      {error && (
        <p id={`${inputId}-err`} className="error-text">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
