// SCR-03 / SC-03 – Trang chính: ô tìm người (TK-06), danh sách hội thoại mới nhất trước (CH-06),
// badge chưa đọc từng dòng + tổng trên đầu trang và tiêu đề tab (TB-01), mở chat 1-1 (CH-01).
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, type UserDto } from "../api/client";
import { searchUsers } from "../api/users";
import { listConversations, openDirect, type ConversationSummaryDto } from "../api/chat";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../auth";
import { M, badgeText } from "../lib/text";
import { ChatPanel } from "./ChatPanel";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { GroupInfoPanel } from "./GroupInfoPanel";

const shortTime = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Sắp theo tin mới nhất (CH-06 R1). */
const sortConvs = (list: ConversationSummaryDto[]) =>
  [...list].sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "") || b.id - a.id);

export function HomePage() {
  const { user, socket } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convs, setConvs] = useState<ConversationSummaryDto[] | null>(null);
  const [convError, setConvError] = useState<string | null>(null);
  const [active, setActive] = useState<ConversationSummaryDto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoKey, setInfoKey] = useState(0);
  const activeRef = useRef<ConversationSummaryDto | null>(null);
  activeRef.current = active; // handler socket đọc hội thoại đang mở mà không phải đăng ký lại
  const seq = useRef(0);

  useEffect(() => {
    const key = q.trim();
    if (!key) { setResults(null); setError(null); return; } // E-TK06-1
    const my = ++seq.current;
    const t = setTimeout(() => {   // GF-07: ~0,3 giây sau khi ngừng gõ
      searchUsers(key)
        .then((r) => { if (my === seq.current) { setResults(r.users); setError(null); } })
        .catch((e) => { if (my === seq.current) setError(e instanceof ApiError ? e.body.message : M.M34); });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadConvs = useCallback(() => {
    setConvError(null);
    listConversations().then((r) => setConvs(sortConvs(r.conversations))).catch(() => setConvError(M.M24));
  }, []);
  useEffect(loadConvs, [loadConvs]);

  // Realtime: dòng hội thoại nhảy lên đầu, trích tin & số chưa đọc đổi mà không tải lại (CH-06 R4).
  useEffect(() => {
    if (!socket) return;
    const onUpdated = ({ conversation }: { conversation: ConversationSummaryDto }) => {
      setConvs((prev) => sortConvs([conversation, ...(prev ?? []).filter((c) => c.id !== conversation.id)]));
      setActive((prev) => (prev && prev.id === conversation.id ? conversation : prev)); // tên nhóm / số thành viên mới
    };
    // NH-03: bị xóa hoặc đã rời → gỡ khỏi danh sách; đang mở thì đóng, bị xóa thì hiện M-32 (GF-18).
    const onRemoved = ({ conversationId, reason }: { conversationId: number; reason: "removed" | "left" }) => {
      setConvs((prev) => prev?.filter((c) => c.id !== conversationId) ?? prev);
      if (activeRef.current?.id !== conversationId) return;
      setActive(null);
      setShowInfo(false);
      if (reason === "removed") setToast(M.M32);
    };
    const onMemberChanged = ({ conversationId }: { conversationId: number }) => {
      if (activeRef.current?.id === conversationId) setInfoKey((k) => k + 1);
    };
    const onUnread = ({ conversationId, unreadCount }: { conversationId: number; unreadCount: number }) =>
      setConvs((prev) => prev?.map((c) => (c.id === conversationId ? { ...c, unreadCount } : c)) ?? prev);
    socket.on("conversation:updated", onUpdated);
    socket.on("unread:update", onUnread);
    socket.on("conversation:removed", onRemoved);
    socket.on("member:changed", onMemberChanged);
    socket.on("connect", loadConvs); // nối lại → tải lại danh sách để không lỡ cập nhật
    return () => {
      socket.off("conversation:updated", onUpdated); socket.off("unread:update", onUnread);
      socket.off("conversation:removed", onRemoved); socket.off("member:changed", onMemberChanged); socket.off("connect", loadConvs);
    };
  }, [socket, loadConvs]);

  const total = (convs ?? []).reduce((s, c) => s + c.unreadCount, 0);
  useEffect(() => {
    document.title = total > 0 ? `(${badgeText(total)}) Chat nội bộ` : "Chat nội bộ"; // TB-01 R5
  }, [total]);

  async function startChat(other: UserDto) {
    try {
      const r = await openDirect(other.id);
      setActive(r.conversation);
      setQ("");
    } catch (e) {
      setToast(e instanceof ApiError ? e.body.message : M.M34);
    }
  }

  const onForbidden = useCallback(() => {
    setToast(M.M30);
    setActive(null);
    loadConvs();
  }, [loadConvs]);

  if (!user) return null;
  return (
    <div className={`app-shell ${active ? "has-active" : ""} ${active?.type === "group" && showInfo ? "has-info" : ""}`}>
      <header className="topbar">
        <span className="brand">
          Chat nội bộ
          {total > 0 && <span className="badge" aria-label={`${total} tin chưa đọc`}>{badgeText(total)}</span>}
        </span>
        <Link to="/ho-so" className="me-link" aria-label={`Hồ sơ của ${user.displayName}`}>
          <Avatar user={user} size={36} />
        </Link>
      </header>
      <aside className="sidebar">
        <label htmlFor="search" className="sr-only">Tìm đồng nghiệp</label>
        <div className="search-row">
          <input id="search" type="search" className="search" placeholder="Tìm đồng nghiệp…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" maxLength={50} />
          <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(true)}>Tạo nhóm</button>
        </div>
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        {results ? (
          <ul className="user-list" aria-label="Kết quả tìm kiếm">
            {results.length === 0 && <li className="empty">{M.M14}</li>}
            {results.map((u) => (
              <li key={u.id}>
                <button type="button" className="user-row as-button" onClick={() => startChat(u)}>
                  <Avatar user={u} />
                  <span className="user-text">
                    <span className="name">{u.displayName}</span>
                    <span className="sub">@{u.username}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {convError && <div role="alert" className="alert alert-error">{convError} <button type="button" className="link-btn" onClick={loadConvs}>Thử lại</button></div>}
            {convs === null && !convError && <p className="placeholder" role="status">Đang tải…</p>}
            {convs?.length === 0 && <p className="placeholder">{M.M23}</p>}
            <ul className="user-list" aria-label="Danh sách hội thoại">
              {convs?.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`user-row as-button conv-row ${active?.id === c.id ? "selected" : ""} ${c.unreadCount ? "unread" : ""}`}
                    onClick={() => setActive(c)}>
                    {c.otherUser ? <Avatar user={c.otherUser} /> : <Avatar user={{ id: c.id, avatarInitial: c.avatarInitial }} />}
                    <span className="user-text">
                      <span className="name">{c.title}</span>
                      <span className="sub">{c.lastMessage ? `${c.lastMessage.isMine ? "Bạn: " : ""}${c.lastMessage.preview}` : ""}</span>
                    </span>
                    <span className="conv-meta">
                      {c.lastMessageAt && <span className="sub">{shortTime(c.lastMessageAt)}</span>}
                      {c.unreadCount > 0 && <span className="badge" aria-label={`${c.unreadCount} tin chưa đọc`}>{badgeText(c.unreadCount)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      <main className="content">
        {toast && <div role="alert" className="alert alert-error">{toast} <button type="button" className="link-btn" onClick={() => setToast(null)} aria-label="Đóng">×</button></div>}
        {active
          ? <ChatPanel key={active.id} conversation={active} meId={user.id} socket={socket} onBack={() => { setActive(null); setShowInfo(false); }}
              onForbidden={onForbidden} onShowInfo={() => setShowInfo(true)} />
          : <p className="placeholder">Xin chào, <strong>{user.displayName}</strong>. Chọn một hội thoại hoặc tìm đồng nghiệp để bắt đầu.</p>}
      </main>
      {active?.type === "group" && showInfo && (
        <GroupInfoPanel conversationId={active.id} meId={user.id} refreshKey={infoKey} onClose={() => setShowInfo(false)}
          onLeft={() => { setConvs((prev) => prev?.filter((c) => c.id !== active.id) ?? prev); setShowInfo(false); setActive(null); }} />
      )}
      {showCreate && (
        <CreateGroupDialog onClose={() => setShowCreate(false)}
          onCreated={(c) => { setShowCreate(false); setActive(c); loadConvs(); }} />
      )}
    </div>
  );
}
