// Bảng định dạng chữ cho ô soạn tin: phông, cỡ, màu. Áp dụng cho tin SẮP GỬI; người nhận thấy đúng như vậy.
import { useEffect, useId, useRef, useState } from "react";
import { COLORS, FONTS, SIZES, formatClass, isDefault, normalize, type MessageFormat } from "../lib/message-format";

export function FormatPicker({ value, onChange, disabled }: { value: MessageFormat; onChange: (f: MessageFormat) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    wrapRef.current?.querySelector<HTMLButtonElement>('.fmt-panel [aria-checked="true"]')?.focus();
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const set = (patch: Partial<MessageFormat>) => onChange(normalize({ ...value, ...patch }));
  const cur = { font: value.font ?? "mac-dinh", size: value.size ?? "vua", color: value.color ?? "mac-dinh" };

  return (
    <div className="fmt-wrap" ref={wrapRef}>
      <button ref={toggleRef} type="button" className={`fmt-toggle ${isDefault(value) ? "" : "active"}`} aria-label="Định dạng chữ"
        title="Phông, cỡ và màu chữ" aria-expanded={open} aria-controls={panelId} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true" className={formatClass({ ...value, size: null })}>Aa</span>
      </button>
      {open && (
        <div id={panelId} className="fmt-panel" role="dialog" aria-label="Định dạng chữ">
          <p className="fmt-label" id={`${panelId}-font`}>Phông chữ</p>
          <div className="fmt-fonts" role="radiogroup" aria-labelledby={`${panelId}-font`}>
            {FONTS.map((f) => (
              <button key={f.key} type="button" role="radio" aria-checked={cur.font === f.key}
                className={`fmt-chip ${f.key === "mac-dinh" ? "" : `fmt-font-${f.key}`}`} onClick={() => set({ font: f.key })}>{f.name}</button>
            ))}
          </div>
          <p className="fmt-label" id={`${panelId}-size`}>Cỡ chữ</p>
          <div className="fmt-sizes" role="radiogroup" aria-labelledby={`${panelId}-size`}>
            {SIZES.map((s) => (
              <button key={s.key} type="button" role="radio" aria-checked={cur.size === s.key} aria-label={s.name} title={s.name}
                className="fmt-chip fmt-size-chip" onClick={() => set({ size: s.key })}>
                <span aria-hidden="true" className={`fmt-size-${s.key}`}>A</span>
              </button>
            ))}
          </div>
          <p className="fmt-label" id={`${panelId}-color`}>Màu chữ</p>
          <div className="fmt-colors" role="radiogroup" aria-labelledby={`${panelId}-color`}>
            {COLORS.map((c) => (
              <button key={c.key} type="button" role="radio" aria-checked={cur.color === c.key} aria-label={c.name} title={c.name}
                className="fmt-swatch" style={{ background: c.hex }} onClick={() => set({ color: c.key })} />
            ))}
          </div>
          <div className="fmt-foot">
            <span className={`fmt-sample ${formatClass(value)}`}>Xin chào!</span>
            <button type="button" className="link-btn" disabled={isDefault(value)} onClick={() => onChange({ font: null, size: null, color: null })}>Đặt lại</button>
          </div>
        </div>
      )}
    </div>
  );
}
