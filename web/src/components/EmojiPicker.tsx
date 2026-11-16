// Bảng biểu tượng cảm xúc cho ô soạn tin. Emoji chỉ là ký tự Unicode trong nội dung tin (CH-02),
// không thêm loại tin hay dữ liệu mới. Không dùng thư viện ngoài.
import { useEffect, useId, useRef, useState } from "react";

const GROUPS: { name: string; items: [string, string][] }[] = [
  {
    name: "Cảm xúc",
    items: [
      ["😀", "cười tươi"], ["😄", "cười lớn"], ["😂", "cười ra nước mắt"], ["🤣", "cười lăn"], ["😊", "mỉm cười"],
      ["🥰", "yêu thương"], ["😍", "mắt trái tim"], ["😘", "hôn gió"], ["😉", "nháy mắt"], ["😎", "ngầu"],
      ["🤔", "suy nghĩ"], ["😅", "cười trừ"], ["😮", "ngạc nhiên"], ["😴", "buồn ngủ"], ["🥲", "cười mà muốn khóc"],
      ["😢", "buồn"], ["😭", "khóc"], ["😡", "giận"], ["🤯", "choáng"], ["🥳", "ăn mừng"],
    ],
  },
  {
    name: "Cử chỉ",
    items: [
      ["👍", "đồng ý"], ["👎", "không đồng ý"], ["👌", "ổn"], ["🙏", "cảm ơn"], ["👏", "vỗ tay"],
      ["🙌", "hoan hô"], ["💪", "cố lên"], ["🤝", "bắt tay"], ["👋", "chào"], ["✌️", "chiến thắng"],
    ],
  },
  {
    name: "Biểu tượng",
    items: [
      ["❤️", "trái tim"], ["🔥", "tuyệt"], ["⭐", "ngôi sao"], ["🎉", "chúc mừng"], ["✅", "xong"],
      ["❌", "không"], ["⚠️", "chú ý"], ["📌", "ghim"], ["📅", "lịch"], ["☕", "cà phê"],
      ["🍜", "ăn trưa"], ["🚀", "bắt đầu"], ["💡", "ý tưởng"], ["📎", "đính kèm"], ["🕐", "đúng giờ"],
    ],
  },
];

export function EmojiPicker({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Đưa focus vào biểu tượng đầu tiên để dùng được bằng bàn phím.
    wrapRef.current?.querySelector<HTMLButtonElement>(".emoji-panel button")?.focus();
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button ref={toggleRef} type="button" className="emoji-toggle" aria-label="Chèn biểu tượng cảm xúc"
        aria-expanded={open} aria-controls={panelId} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">😊</span>
      </button>
      {open && (
        <div id={panelId} className="emoji-panel" role="dialog" aria-label="Biểu tượng cảm xúc">
          {GROUPS.map((g) => (
            <div key={g.name} className="emoji-group" role="group" aria-label={g.name}>
              <p className="emoji-group-name">{g.name}</p>
              <div className="emoji-grid">
                {g.items.map(([ch, label]) => (
                  <button key={ch} type="button" aria-label={label} title={label} onClick={() => onPick(ch)}>{ch}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tin chỉ gồm 1–3 emoji (không có chữ) thì hiển thị cỡ lớn. */
export function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 24) return false;
  const stripped = t.replace(/\p{Extended_Pictographic}|️|‍|\p{Emoji_Modifier}|\s/gu, "");
  if (stripped.length) return false;
  const count = (t.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  return count >= 1 && count <= 3;
}
