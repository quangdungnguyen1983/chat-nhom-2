import { passwordRules } from "../lib/text";

/** Danh sách kiểm tra cập nhật theo từng phím gõ (FRS-02 hành vi 1). */
export function PasswordChecklist({ value }: { value: string }) {
  const r = passwordRules(value);
  const items: Array<[boolean, string]> = [
    [r.minLength && r.maxLength, "Ít nhất 8 ký tự"],
    [r.hasLetter, "Có chữ cái"],
    [r.hasDigit, "Có chữ số"],
  ];
  return (
    <ul className="pw-checklist" aria-label="Yêu cầu mật khẩu">
      {items.map(([ok, text]) => (
        <li key={text} className={ok ? "ok" : undefined}>
          <span aria-hidden="true">{ok ? "✓" : "○"}</span> {text}
          <span className="sr-only">{ok ? " – đã đạt" : " – chưa đạt"}</span>
        </li>
      ))}
    </ul>
  );
}
