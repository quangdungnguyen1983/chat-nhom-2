// SCR-05 / SC-05 – Tạo nhóm (NH-01): tên 1–100 ký tự, chọn ≥ 2 người; nút khóa khi chưa đủ.
import { useState, type FormEvent } from "react";
import type { UserDto } from "../api/client";
import { ApiError } from "../api/client";
import { createGroup, type ConversationDetailDto } from "../api/groups";
import { Dialog } from "../components/Dialog";
import { Field } from "../components/Field";
import { SubmitButton } from "../components/SubmitButton";
import { UserPicker } from "../components/UserPicker";
import { M, checkGroupName } from "../lib/text";

export function CreateGroupDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ConversationDetailDto) => void }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<UserDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enough = picked.length >= 2;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nameErr = checkGroupName(name);
    if (nameErr) return setError(nameErr);
    if (!enough) return setError(M.M26);
    setBusy(true); setError(null);
    try {
      onCreated((await createGroup(name, picked.map((u) => u.id))).conversation);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : M.M34);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Tạo nhóm" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        <UserPicker label="Thêm thành viên" selected={picked} onChange={setPicked} />
        <p className={enough ? "hint" : "hint warn"}>Đã chọn: {picked.length} người{enough ? "" : ` – ${M.M26}`}</p>
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        <div className="actions">
          <SubmitButton busy={busy} disabled={!enough}>Tạo nhóm</SubmitButton>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </Dialog>
  );
}
