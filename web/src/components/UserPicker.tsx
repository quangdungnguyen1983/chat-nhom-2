// Ô tìm + thẻ người đã chọn (SC-05, SC-06a). Dùng lại TK-06; ở SC-06a loại người đã trong nhóm (GF-08).
import { useEffect, useRef, useState } from "react";
import type { UserDto } from "../api/client";
import { searchUsers } from "../api/users";
import { Avatar } from "./Avatar";
import { M } from "../lib/text";

export function UserPicker({ selected, onChange, excludeConversationId, label }: {
  selected: UserDto[]; onChange: (u: UserDto[]) => void; excludeConversationId?: number; label: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserDto[] | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const key = q.trim();
    if (!key) { setResults(null); return; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      searchUsers(key, excludeConversationId).then((r) => { if (my === seq.current) setResults(r.users); }).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [q, excludeConversationId]);

  const toggle = (u: UserDto) =>
    onChange(selected.some((x) => x.id === u.id) ? selected.filter((x) => x.id !== u.id) : [...selected, u]);

  return (
    <div className="field">
      <label htmlFor="picker">{label}</label>
      {selected.length > 0 && (
        <ul className="chips" aria-label="Người đã chọn">
          {selected.map((u) => (
            <li key={u.id} className="chip">
              {u.displayName}
              <button type="button" aria-label={`Bỏ chọn ${u.displayName}`} onClick={() => toggle(u)}>×</button>
            </li>
          ))}
        </ul>
      )}
      <input id="picker" type="search" className="search" placeholder="Tìm đồng nghiệp…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" maxLength={50} />
      {results && (
        <ul className="user-list picker-results" aria-label="Kết quả tìm kiếm">
          {results.length === 0 && <li className="empty">{M.M14}</li>}
          {results.map((u) => {
            const on = selected.some((x) => x.id === u.id);
            return (
              <li key={u.id}>
                <button type="button" className={`user-row as-button ${on ? "selected" : ""}`} aria-pressed={on} onClick={() => toggle(u)}>
                  <Avatar user={u} size={32} />
                  <span className="user-text"><span className="name">{u.displayName}</span><span className="sub">@{u.username}</span></span>
                  {on && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
