import { useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

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

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
};

/** Listbox một lựa chọn (native <select>): dùng được bằng bàn phím và trình đọc màn hình. */
export function SelectField({ label, error, hint, placeholder, options, id, ...rest }: SelectProps) {
  const auto = useId();
  const selectId = id ?? auto;
  const describedBy = [hint ? `${selectId}-hint` : null, error ? `${selectId}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={selectId}>{label}</label>
      <div className="input-wrap">
        <select id={selectId} {...rest} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={error ? "invalid" : undefined}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {hint && <p id={`${selectId}-hint`} className="hint">{hint}</p>}
      {error && (
        <p id={`${selectId}-err`} className="error-text">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
