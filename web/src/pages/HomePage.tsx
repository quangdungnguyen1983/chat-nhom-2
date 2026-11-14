// SCR-03 / SC-03 – Trang chính. Slice 1 chỉ có: đầu trang (avatar → hồ sơ) và ô tìm người (TK-06).
// Danh sách hội thoại, "Tạo nhóm", mở chat 1-1 thuộc slice sau (CH-01, CH-06, NH-01).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, type UserDto } from "../api/client";
import { searchUsers } from "../api/users";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../auth";
import { M } from "../lib/text";

export function HomePage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const key = q.trim();
    if (!key) { setResults(null); setError(null); return; } // E-TK06-1: ô trống không tìm, xóa kết quả
    const my = ++seq.current;
    const t = setTimeout(() => {   // GF-07: gửi sau khi ngừng gõ ~0,3 giây
      searchUsers(key)
        .then((r) => { if (my === seq.current) { setResults(r.users); setError(null); } })
        .catch((e) => { if (my === seq.current) setError(e instanceof ApiError ? e.body.message : M.M34); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (!user) return null;
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Chat nội bộ</span>
        <Link to="/ho-so" className="me-link" aria-label={`Hồ sơ của ${user.displayName}`}>
          <Avatar user={user} size={36} />
        </Link>
      </header>
      <aside className="sidebar">
        <label htmlFor="search" className="sr-only">Tìm đồng nghiệp</label>
        <input id="search" type="search" className="search" placeholder="Tìm đồng nghiệp…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" maxLength={50} />
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        {results && (
          <ul className="user-list" aria-label="Kết quả tìm kiếm">
            {results.length === 0 && <li className="empty">{M.M14}</li>}
            {results.map((u) => (
              <li key={u.id} className="user-row">
                <Avatar user={u} />
                <span className="user-text">
                  <span className="name">{u.displayName}</span>
                  <span className="sub">@{u.username}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {!results && <p className="placeholder">Danh sách hội thoại sẽ có ở bản tiếp theo. Hãy thử tìm đồng nghiệp ở ô phía trên.</p>}
      </aside>
      <main className="content">
        <p className="placeholder">Xin chào, <strong>{user.displayName}</strong>.</p>
      </main>
    </div>
  );
}
