// Đổi hình nền khung chat. Lựa chọn lưu trong trình duyệt (localStorage) theo từng người dùng –
// không đổi API hay CSDL. Đổi máy / trình duyệt khác thì về nền mặc định.
import { useEffect, useId, useRef, useState } from "react";

export const CHAT_BACKGROUNDS = [
  { id: "tre", name: "Lá tre" },
  { id: "tron", name: "Trơn" },
  { id: "o-ly", name: "Giấy kẻ ô" },
  { id: "bien", name: "Biển xanh" },
  { id: "hoang-hon", name: "Hoàng hôn" },
  { id: "sen", name: "Hoa sen" },
  { id: "dem", name: "Trời đêm" },
] as const;

export type ChatBackgroundId = (typeof CHAT_BACKGROUNDS)[number]["id"];
const DEFAULT: ChatBackgroundId = "tre";
const key = (userId: number) => `chat-bg:${userId}`;
const isKnown = (v: string | null): v is ChatBackgroundId => CHAT_BACKGROUNDS.some((b) => b.id === v);

function read(userId: number): ChatBackgroundId {
  try {
    const v = localStorage.getItem(key(userId));
    return isKnown(v) ? v : DEFAULT;
  } catch {
    return DEFAULT; // trình duyệt chặn localStorage
  }
}

/** Hình nền đang chọn của người dùng; đồng bộ giữa các tab qua sự kiện "storage". */
export function useChatBackground(userId: number): [ChatBackgroundId, (id: ChatBackgroundId) => void] {
  const [bg, setBg] = useState<ChatBackgroundId>(() => read(userId));
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === key(userId)) setBg(read(userId)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);
  const choose = (id: ChatBackgroundId) => {
    setBg(id);
    try { localStorage.setItem(key(userId), id); } catch { /* không lưu được thì chỉ đổi trong phiên này */ }
  };
  return [bg, choose];
}

export function ChatBackgroundPicker({ value, onChange }: { value: ChatBackgroundId; onChange: (id: ChatBackgroundId) => void }) {
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
    wrapRef.current?.querySelector<HTMLButtonElement>('.bg-swatch[aria-checked="true"]')?.focus();
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="bg-picker" ref={wrapRef}>
      <button ref={toggleRef} type="button" className="btn btn-secondary bg-toggle" aria-label="Đổi hình nền khung chat"
        title="Đổi hình nền" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="bg-panel" role="dialog" aria-label="Hình nền khung chat">
          <p className="bg-panel-title">Hình nền khung chat</p>
          <div className="bg-grid" role="radiogroup" aria-label="Chọn hình nền">
            {CHAT_BACKGROUNDS.map((b) => (
              <button key={b.id} type="button" role="radio" aria-checked={value === b.id} className="bg-swatch"
                onClick={() => onChange(b.id)}>
                <span className="bg-preview chat-bg" data-bg={b.id} aria-hidden="true">
                  <span className="bg-mini theirs" /><span className="bg-mini mine" />
                </span>
                <span className="bg-name">{b.name}</span>
              </button>
            ))}
          </div>
          <p className="bg-note">Chỉ lưu trên trình duyệt này.</p>
        </div>
      )}
    </div>
  );
}
