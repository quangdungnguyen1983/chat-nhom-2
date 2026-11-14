// SCR-06 / SC-06 – Thông tin nhóm; SC-06a Thêm thành viên; SC-06b Rời nhóm (NH-03).
// Giao diện chỉ hiện nút theo vai trò; quyền thật do máy chủ kiểm tra (FRS-13).
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, type UserDto } from "../api/client";
import { addMembers, getConversation, leaveGroup, removeMember, renameGroup, type ConversationDetailDto } from "../api/groups";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { Field } from "../components/Field";
import { SubmitButton } from "../components/SubmitButton";
import { UserPicker } from "../components/UserPicker";
import { M, checkGroupName, nfc } from "../lib/text";

export function GroupInfoPanel({ conversationId, meId, refreshKey, onClose, onLeft }: {
  conversationId: number; meId: number; refreshKey: number; onClose: () => void; onLeft: () => void;
}) {
  const [detail, setDetail] = useState<ConversationDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "add" | "leave" | { remove: UserDto }>(null);

  const load = useCallback(() => {
    getConversation(conversationId).then((r) => setDetail(r.conversation)).catch((e) => setError(e instanceof ApiError ? e.body.message : M.M34));
  }, [conversationId]);
  useEffect(load, [load, refreshKey]); // member:changed → tải lại

  if (!detail) return <aside className="group-info">{error ? <div role="alert" className="alert alert-error">{error}</div> : <p role="status">Đang tải…</p>}</aside>;
  const isOwner = detail.myRole === "owner";

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const err = checkGroupName(name);
    if (err) return setError(err);
    setBusy(true); setError(null);
    try { setDetail((await renameGroup(conversationId, name)).conversation); setEditing(false); }
    catch (x) { setError(x instanceof ApiError ? x.body.message : M.M34); }
    finally { setBusy(false); }
  }

  return (
    <aside className="group-info" aria-label="Thông tin nhóm">
      <header className="chat-head">
        <h2>Thông tin nhóm</h2>
        <button type="button" className="btn btn-secondary" onClick={onClose} aria-label="Đóng thông tin nhóm">×</button>
      </header>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {editing ? (
        <form onSubmit={saveName} noValidate>
          <Field label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          <div className="actions">
            <SubmitButton busy={busy} disabled={nfc(name).trim() === detail.name}>Lưu</SubmitButton>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Hủy</button>
          </div>
        </form>
      ) : (
        <p className="group-name">
          <strong>{detail.name}</strong>
          {isOwner && <button type="button" className="link-btn" onClick={() => { setName(detail.name ?? ""); setEditing(true); }}>Sửa tên</button>}
        </p>
      )}
      <h3>Thành viên ({detail.memberCount})</h3>
      <ul className="user-list">
        {detail.members.map((m) => (
          <li key={m.user.id} className="user-row">
            <Avatar user={m.user} size={32} />
            <span className="user-text">
              <span className="name">{m.user.displayName}{m.user.id === meId ? " (bạn)" : ""}</span>
              <span className="sub">@{m.user.username}{m.role === "owner" ? " · Trưởng nhóm" : ""}</span>
            </span>
            {isOwner && m.user.id !== meId && (
              <button type="button" className="btn btn-danger small" onClick={() => setDialog({ remove: m.user })}>Xóa</button>
            )}
          </li>
        ))}
      </ul>
      <div className="actions">
        {isOwner && <button type="button" className="btn btn-secondary" onClick={() => setDialog("add")}>Thêm thành viên</button>}
        <button type="button" className="btn btn-danger" onClick={() => setDialog("leave")}>Rời nhóm</button>
      </div>

      {dialog === "add" && <AddMembersDialog conversationId={conversationId} onClose={() => setDialog(null)} onDone={(d) => { setDetail(d); setDialog(null); }} />}
      {dialog === "leave" && <LeaveDialog detail={detail} meId={meId} onClose={() => setDialog(null)} onLeft={onLeft} />}
      {dialog && typeof dialog === "object" && (
        <ConfirmRemove conversationId={conversationId} user={dialog.remove} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
      )}
    </aside>
  );
}

function AddMembersDialog({ conversationId, onClose, onDone }: { conversationId: number; onClose: () => void; onDone: (d: ConversationDetailDto) => void }) {
  const [picked, setPicked] = useState<UserDto[]>([]);
  const [showHistory, setShowHistory] = useState(false); // mặc định KHÔNG đánh dấu (QĐ-08)
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { onDone((await addMembers(conversationId, picked.map((u) => u.id), showHistory)).conversation); }
    catch (x) { setError(x instanceof ApiError ? x.body.message : M.M34); }
    finally { setBusy(false); }
  }
  return (
    <Dialog title="Thêm thành viên" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <UserPicker label="Tìm người để thêm" selected={picked} onChange={setPicked} excludeConversationId={conversationId} />
        <label className="checkbox"><input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} /> Cho xem tin nhắn trước đó</label>
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        <div className="actions">
          <SubmitButton busy={busy} disabled={picked.length === 0}>Thêm</SubmitButton>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmRemove({ conversationId, user, onClose, onDone }: { conversationId: number; user: UserDto; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await removeMember(conversationId, user.id); onDone(); }
    catch (x) { setError(x instanceof ApiError ? x.body.message : M.M34); setBusy(false); }
  }
  return (
    <Dialog title="Xóa thành viên" onClose={onClose}>
      <p>{M.M43.replace("{tên}", user.displayName)}</p>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <div className="actions">
        <button type="button" className="btn btn-danger" onClick={go} disabled={busy}>Xóa</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      </div>
    </Dialog>
  );
}

function LeaveDialog({ detail, meId, onClose, onLeft }: { detail: ConversationDetailDto; meId: number; onClose: () => void; onLeft: () => void }) {
  const others = detail.members.filter((m) => m.user.id !== meId);
  const isOwner = detail.myRole === "owner";
  const alone = isOwner && others.length === 0;
  const [newOwner, setNewOwner] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = alone || (isOwner && newOwner === "");
  async function go() {
    setBusy(true);
    try { await leaveGroup(detail.id, isOwner ? Number(newOwner) : undefined); onLeft(); }
    catch (x) { setError(x instanceof ApiError ? x.body.message : M.M34); setBusy(false); }
  }
  return (
    <Dialog title="Rời nhóm" onClose={onClose}>
      <p>{M.M44.replace("{tên nhóm}", detail.name ?? "")}</p>
      {alone && <div role="alert" className="alert alert-error">{M.M28}</div>}
      {isOwner && !alone && (
        <div className="field">
          <label htmlFor="new-owner">Chọn trưởng nhóm mới</label>
          <select id="new-owner" value={newOwner} onChange={(e) => setNewOwner(e.target.value ? Number(e.target.value) : "")}>
            <option value="">— Chọn thành viên —</option>
            {others.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.displayName} (@{m.user.username})</option>)}
          </select>
          {newOwner === "" && <p className="hint">{M.M37}</p>}
        </div>
      )}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <div className="actions">
        <button type="button" className="btn btn-danger" onClick={go} disabled={busy || blocked}>Rời nhóm</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      </div>
    </Dialog>
  );
}
