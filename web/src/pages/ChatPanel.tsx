// SCR-04 / SC-04 – Hội thoại (1-1 và nhóm): 50 tin gần nhất, tải tin cũ hơn, gửi qua WebSocket (CH-02, CH-03, NH-02).
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Socket } from "socket.io-client";
import { ApiError } from "../api/client";
import { getMessages, getMessagesAfter, markRead, type ConversationSummaryDto, type MessageDto } from "../api/chat";
import { dayLabel, hhmm, sameDay } from "../lib/datetime";
import { Avatar } from "../components/Avatar";
import { M, MAX_MESSAGE_CHARS, countChars, formatCount, hasVisibleChar, normalizeContent, tooLongMessage } from "../lib/text";

type Item = MessageDto & { pending?: boolean; failed?: boolean };
type SendAck = { ok: true; message: MessageDto; duplicate: boolean } | { ok: false; error: { code: string; message: string; retryable: boolean } };

const time = hhmm;

/** Thiết bị cảm ứng (điện thoại): Enter xuống dòng, gửi bằng nút "Gửi" (GF-10). */
const isTouch = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

export function ChatPanel({ conversation, meId, socket, onBack, onForbidden, onShowInfo }: {
  conversation: ConversationSummaryDto; meId: number; socket: Socket | null; onBack: () => void; onForbidden: () => void;
  /** Nhóm: mở SC-06 Thông tin nhóm. */
  onShowInfo?: () => void;
}) {
  const convId = conversation.id;
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket?.connected ?? false);
  const [newBelow, setNewBelow] = useState(false); // GF-15: có tin mới khi đang đọc tin cũ
  const logRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const stickBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);

  const read = useCallback(() => {
    if (document.visibilityState === "visible") markRead(convId).catch(() => undefined); // TB-01 R2
  }, [convId]);

  // Mở hội thoại: 50 tin gần nhất (CH-03 R2) rồi báo đã đọc (TB-01 R3).
  useEffect(() => {
    let alive = true;
    setItems([]); setHasMore(false); setCursor(null); setLoadError(null); stickBottom.current = true;
    getMessages(convId)
      .then((p) => { if (!alive) return; setItems(p.messages); setHasMore(p.hasMore); setCursor(p.nextCursor); read(); })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 403) onForbidden();
        else setLoadError(e instanceof ApiError ? e.body.message : M.M34);
      });
    return () => { alive = false; };
  }, [convId, read, onForbidden]);

  // Tin mới realtime. Tin có clientMessageId trùng tin tạm → thay tin tạm bằng tin chính thức.
  useEffect(() => {
    if (!socket) return;
    const onNew = ({ message }: { message: MessageDto }) => {
      if (message.conversationId !== convId) return;
      setItems((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const i = message.clientMessageId ? prev.findIndex((m) => m.pending !== undefined && m.clientMessageId === message.clientMessageId) : -1;
        if (i >= 0) { const next = [...prev]; next[i] = message; return next; }
        return [...prev, message];
      });
      if (message.sender?.id !== meId) {
        if (!stickBottom.current) setNewBelow(true); // không tự cuộn, hiện "Có tin nhắn mới ↓"
        read();
      }
    };
    // Nối lại sau khi mất mạng: tải tin bị lỡ bằng `after` (GL-06); lỡ quá 50 tin thì tải lại 50 tin mới nhất.
    const up = () => {
      setConnected(true);
      const lastId = itemsRef.current.filter((m) => m.id > 0).at(-1)?.id;
      if (!lastId) return;
      getMessagesAfter(convId, lastId).then((p) => {
        if (p.hasMore) {
          return getMessages(convId).then((latest) => { setItems(latest.messages); setHasMore(latest.hasMore); setCursor(latest.nextCursor); });
        }
        if (p.messages.length) setItems((prev) => [...prev, ...p.messages.filter((m) => !prev.some((x) => x.id === m.id))]);
      }).catch(() => undefined);
    };
    const down = () => setConnected(false);
    socket.on("message:new", onNew);
    socket.on("connect", up);
    socket.on("disconnect", down);
    setConnected(socket.connected);
    return () => { socket.off("message:new", onNew); socket.off("connect", up); socket.off("disconnect", down); };
  }, [socket, convId, meId, read]);

  useEffect(() => {
    const onVis = () => read();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [read]);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (keepOffset.current !== null) { el.scrollTop = el.scrollHeight - keepOffset.current; keepOffset.current = null; }
    else if (stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  function scrollToBottom() {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickBottom.current = true;
    setNewBelow(false);
  }

  async function loadOlder() {
    if (!hasMore || loadingOlder || cursor === null) return;
    setLoadingOlder(true); setLoadError(null);
    try {
      const p = await getMessages(convId, cursor);
      const el = logRef.current;
      keepOffset.current = el ? el.scrollHeight - el.scrollTop : null;
      setItems((prev) => [...p.messages.filter((m) => !prev.some((x) => x.id === m.id)), ...prev]);
      setHasMore(p.hasMore); setCursor(p.nextCursor);
    } catch {
      setLoadError(M.M22);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function deliver(item: Item) {
    if (!socket) return;
    try {
      const ack = (await socket.timeout(10_000).emitWithAck("message:send", {
        conversationId: convId, content: item.content, clientMessageId: item.clientMessageId,
      })) as SendAck;
      if (ack.ok) {
        setItems((prev) => {
          const without = prev.filter((m) => !(m.pending !== undefined && m.clientMessageId === item.clientMessageId));
          return without.some((m) => m.id === ack.message.id) ? without : [...without, ack.message].sort((a, b) => a.id - b.id);
        });
      } else if (ack.error.code === "CONVERSATION_FORBIDDEN") {
        onForbidden();
      } else {
        setItems((prev) => prev.map((m) => (m.clientMessageId === item.clientMessageId && m.pending !== undefined ? { ...m, pending: false, failed: true } : m)));
        if (!ack.error.retryable) setSendError(ack.error.message);
      }
    } catch {
      // Không có ack sau 10 giây → đánh dấu lỗi, cho gửi lại với CÙNG clientMessageId (GF-13).
      setItems((prev) => prev.map((m) => (m.clientMessageId === item.clientMessageId && m.pending !== undefined ? { ...m, pending: false, failed: true } : m)));
    }
  }

  const content = normalizeContent(draft);
  const n = countChars(content);
  const tooLong = n > MAX_MESSAGE_CHARS;
  const canSend = hasVisibleChar(content) && !tooLong && !!socket;

  function submit() {
    if (!canSend) return;
    const pending: Item = {
      id: -Date.now(), conversationId: convId, type: "text", content, sender: null, eventType: null,
      clientMessageId: crypto.randomUUID(), createdAt: new Date().toISOString(), pending: true,
    };
    stickBottom.current = true;
    setItems((prev) => [...prev, pending]);
    setDraft(""); setSendError(null);
    void deliver(pending);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Máy tính: Enter gửi, Shift+Enter xuống dòng. Điện thoại: Enter xuống dòng (GF-10).
    // KHÔNG gửi khi bộ gõ tiếng Việt đang ghép chữ (GX-04).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) { e.preventDefault(); submit(); }
  }

  return (
    <section className="chat" aria-label={`Hội thoại với ${conversation.title}`}>
      <header className="chat-head">
        <button type="button" className="btn btn-secondary back" onClick={onBack} aria-label="Quay lại">←</button>
        <Avatar user={conversation.otherUser ?? { id: conversation.id, avatarInitial: conversation.avatarInitial }} />
        <div className="chat-title">
          <h2>{conversation.title}</h2>
          {conversation.type === "group" && <span className="sub">{conversation.memberCount} thành viên</span>}
        </div>
        {conversation.type === "group" && onShowInfo && (
          <button type="button" className="btn btn-secondary info-btn" onClick={onShowInfo}>Thông tin nhóm</button>
        )}
      </header>
      {!connected && <div className="conn-bar" role="status">{M.M33}</div>}
      <div className="chat-log" ref={logRef} role="log" aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (stickBottom.current) setNewBelow(false);
          if (el.scrollTop < 40) void loadOlder(); // cuộn lên đầu → 50 tin cũ hơn (CH-03 R3)
        }}>
        {hasMore && <button type="button" className="btn btn-secondary older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? "Đang tải…" : "Tải tin cũ hơn"}</button>}
        {!hasMore && items.length > 0 && <p className="history-end">{M.M21}</p>}
        {loadError && <div role="alert" className="alert alert-error">{loadError}</div>}
        {items.map((m, i) => {
          // Dòng ngày "Hôm nay" / "Hôm qua" / "Thứ Năm, 12/11/2026" trước tin đầu tiên của mỗi ngày (10-ui-ux mục 11.1).
          const day = i === 0 || !sameDay(items[i - 1].createdAt, m.createdAt)
            ? <p className="day-sep">{dayLabel(m.createdAt)}</p> : null;
          // NH-04: tin hệ thống căn giữa, chữ nhỏ màu xám, không avatar, kèm giờ (FRS-14).
          if (m.type === "system") {
            return (
              <Fragment key={m.id}>
                {day}
                <p className="system-msg"><span className="system-text">{m.content}</span> · {time(m.createdAt)}</p>
              </Fragment>
            );
          }
          const mine = m.pending !== undefined || m.sender?.id === meId;
          const showSender = conversation.type === "group" && !mine && m.sender; // NH-02 R2: tên + avatar cạnh MỖI tin
          return (
            <Fragment key={m.clientMessageId ?? m.id}>
            {day}
            <div className={`bubble-row ${mine ? "mine" : "theirs"}`}>
              {showSender && <Avatar user={m.sender!} size={32} />}
              <div className={`bubble ${m.failed ? "failed" : ""}`}>
                {showSender && <div className="bubble-sender">{m.sender!.displayName}</div>}
                <div className="bubble-text">{m.content}</div>
                <div className="bubble-meta">
                  {m.pending ? <em>đang gửi…</em> : m.failed ? (
                    <>
                      <span aria-hidden="true">⚠ </span>{M.M20}{" "}
                      <button type="button" className="link-btn" onClick={() => {
                        setItems((prev) => prev.map((x) => (x.clientMessageId === m.clientMessageId ? { ...x, failed: false, pending: true } : x)));
                        void deliver(m);
                      }}>Gửi lại</button>
                    </>
                  ) : time(m.createdAt)}
                </div>
              </div>
            </div>
            </Fragment>
          );
        })}
      </div>
      {newBelow && <button type="button" className="btn btn-secondary new-below" onClick={scrollToBottom}>Có tin nhắn mới ↓</button>}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="composer" className="sr-only">Nhập tin nhắn</label>
        <textarea id="composer" rows={2} value={draft} placeholder="Nhập tin nhắn…" onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
          aria-invalid={tooLong || undefined} aria-describedby="composer-count" />
        <button type="submit" className="btn btn-primary send" disabled={!canSend}>Gửi</button>
        {(n > 4500 || sendError) && (
          <p id="composer-count" className={tooLong || sendError ? "error-text" : "hint"} role={tooLong ? "alert" : undefined}>
            {tooLong ? tooLongMessage(n) : sendError ?? `${formatCount(n)} / ${formatCount(MAX_MESSAGE_CHARS)}`}
          </p>
        )}
      </form>
    </section>
  );
}
