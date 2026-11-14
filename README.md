# Chat nội bộ (MVP)

- **Slice 1 – Tài khoản**: đăng ký (TK-01, TK-02), đăng nhập / đăng xuất (TK-03), đổi mật khẩu (TK-04), hồ sơ (TK-05), tìm người dùng (TK-06).
- **Slice 2 – Chat realtime 1-1**: mở hội thoại 1-1 không trùng (CH-01), gửi/nhận qua WebSocket (CH-02), lịch sử 50 tin/trang (CH-03), danh sách hội thoại mới nhất trước (CH-06), số chưa đọc (TB-01).
- **Slice 3 – Nhóm**: tạo nhóm ≥ 2 người được chọn, người tạo là trưởng nhóm (NH-01); nhắn tin nhóm realtime kèm tên + avatar người gửi (NH-02); trưởng nhóm thêm / xóa / đổi tên, thành viên tự rời, trưởng nhóm rời phải chuyển quyền (NH-03); tin hệ thống HT-01…HT-06 trong dòng chat (NH-04).

Thiết kế theo `08-high-level-design.md`, `09-detailed-design.md`, `10-ui-ux.md` (đều đang **Draft**, ADR chờ duyệt – xem "Lưu ý" cuối trang).

| Phần | Công nghệ (theo HLD mục 2) |
|---|---|
| Giao diện | React 19 + TypeScript + Vite (`web/`) |
| Máy chủ | Node.js + Express 5 + TypeScript (`server/`) |
| Realtime | Socket.IO 4, **chỉ transport WebSocket** (`transports: ["websocket"]` ở cả hai phía, máy chủ từ chối long-polling) – ADR-03 |
| CSDL | SQLite qua Prisma 6 (ADR-01) – file thật trên đĩa, không mất khi khởi động lại |
| Mật khẩu | argon2id (`@node-rs/argon2`) – theo 09 mục 4.3 / GT-01 |
| Phiên | Token ngẫu nhiên 256 bit, chỉ lưu SHA-256 trong bảng `sessions`, gửi bằng cookie `HttpOnly; SameSite=Lax` (ADR-02). Đăng xuất / đổi mật khẩu ghi `revoked_at` → token cũ bị từ chối ngay |
| Test | Vitest + Supertest (server, CSDL SQLite tạm thật), Vitest + Testing Library (web) |

## 1. Yêu cầu

- Node.js **≥ 20** (đã chạy thử với Node 22) và npm.
- Không cần cài máy chủ CSDL.

## 2. Cài đặt và chạy local

```bash
npm install
```

Tạo file cấu hình cho máy chủ từ mẫu (file `server/.env` **không** được commit):

```bash
cp .env.example server/.env
```

Mở `server/.env` và đặt `REGISTRATION_CODE` (mã đăng ký tổ chức, ≥ 8 ký tự, tự chọn – không chia sẻ công khai). Có thể sinh mã ngẫu nhiên bằng:

```bash
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

Tạo CSDL (áp migration vào `server/data/chat.db`):

```bash
npm run db:migrate
```

Chạy máy chủ (cổng 3000) và giao diện (cổng 5173) cùng lúc:

```bash
npm run dev
```

Mở <http://localhost:5173>. Vite chuyển tiếp `/api` sang máy chủ nên trình duyệt thấy một địa chỉ duy nhất (cookie phiên hoạt động).

> **Windows (cmd/PowerShell):** script `dev` dùng `&` của bash. Nếu không chạy được, mở hai cửa sổ và chạy lần lượt `npm run dev --workspace server` và `npm run dev --workspace web`. Thay `cp` bằng `copy .env.example server\.env`.

### Chạy kiểu demo (một cổng, máy chủ phục vụ luôn giao diện)

```bash
npm run build
```

Trong `server/.env` đặt `NODE_ENV=production`, `APP_ORIGIN` = địa chỉ trình duyệt sẽ mở (ví dụ `http://localhost:3000` hoặc địa chỉ `https://…` của Codespaces), `COOKIE_SECURE=true` nếu chạy sau HTTPS. Rồi:

```bash
npm start
```

## 3. Các lệnh npm

| Lệnh (chạy ở thư mục gốc) | Việc làm |
|---|---|
| `npm run dev` | Máy chủ (tsx watch) + Vite dev server |
| `npm run db:migrate` | `prisma migrate deploy` – tạo/cập nhật bảng |
| `npm test` | Toàn bộ test server rồi web |
| `npm run typecheck` | Kiểm tra kiểu TypeScript cả hai phần (gồm cả file test) |
| `npm run build` | Build máy chủ (`server/dist`) và giao diện (`web/dist`) |
| `npm start` | Chạy bản build của máy chủ |

Test server **không** cần `server/.env`: mỗi file test tự tạo một file SQLite tạm, áp migration thật, xóa khi xong (09 mục 13.2).

## 4. Biến môi trường

Xem `.env.example` và `09-detailed-design.md` mục 11. Máy chủ **dừng khởi động** nếu thiếu biến bắt buộc (chỉ in tên biến, không in giá trị).

## 5. API trong slice này (09 mục 6)

| # | Method | Path | Auth | Mã yêu cầu |
|---|---|---|---|---|
| A1 | POST | `/api/auth/register` | Không | TK-01, TK-02 |
| A2 | POST | `/api/auth/login` | Không | TK-03 |
| A3 | POST | `/api/auth/logout` | Phiên | TK-03 |
| A4 | PUT | `/api/me/password` | Phiên | TK-04 |
| U1 | GET | `/api/me` | Phiên | TK-05, TK-03 |
| U2 | PUT | `/api/me` | Phiên | TK-05 |
| U3 | GET | `/api/users?q=` | Phiên | TK-06 |
| C1 | POST | `/api/conversations/direct` `{userId}` | Phiên | CH-01 (201 vừa tạo / 200 đã có) |
| C2 | GET | `/api/conversations` | Phiên | CH-06, TB-01 |
| C3 | GET | `/api/conversations/:id` | Thành viên | CH-01 |
| C4 | GET | `/api/conversations/:id/messages?before=&after=&limit=` | Thành viên | CH-03 (tối đa 50) |
| C5 | POST | `/api/conversations/:id/read` | Thành viên | TB-01 |
| G1 | POST | `/api/conversations/group` `{name, memberIds}` | Phiên | NH-01, NH-04 |
| G2 | PATCH | `/api/conversations/:id` `{name}` | Trưởng nhóm | NH-03, NH-04 |
| G3 | POST | `/api/conversations/:id/members` `{userIds, showHistory?}` | Trưởng nhóm | NH-03, NH-04 |
| G4 | DELETE | `/api/conversations/:id/members/:userId` | Trưởng nhóm | NH-03, NH-04 |
| G5 | POST | `/api/conversations/:id/leave` `{newOwnerId?}` | Thành viên | NH-03, NH-04 |

**Socket.IO** (cùng địa chỉ, cookie phiên + `Origin` kiểm tra khi bắt tay):

| Sự kiện | Chiều | Ghi chú |
|---|---|---|
| `message:send` `{conversationId, content, clientMessageId}` + ack | client → server | Không nhận `senderId` (có là bị từ chối). Lưu CSDL **xong** mới ack và phát. Gửi lại cùng `clientMessageId` → `duplicate: true` |
| `message:new` | server → phòng `conv:<id>` | Chỉ socket của thành viên hiện tại ở trong phòng; không có sự kiện nào cho client tự vào phòng |
| `conversation:updated`, `unread:update` | server → phòng `user:<id>` | Dòng danh sách + số chưa đọc tính riêng cho từng người |
| `session:revoked` | server → phòng `session:<id>` | Đăng xuất / đổi mật khẩu / hết hạn → báo rồi ngắt socket |
| `member:changed` | server → phòng `conv:<id>` | Nhóm: thêm / xóa / rời / chuyển quyền / đổi tên |
| `conversation:removed` | server → phòng `user:<id>` | Người bị xóa (`removed` → giao diện hiện M-32) hoặc vừa rời (`left`). Máy chủ cho socket rời phòng **trước** khi phát tin hệ thống |

**Người ngoài hội thoại** (và hội thoại không tồn tại) nhận **cùng một** phản hồi: REST `403 CONVERSATION_FORBIDDEN` + M-30; socket: ack `{ok:false, error.code: "CONVERSATION_FORBIDDEN"}`, không lưu, không phát.

Lỗi trả dạng `{"error": {"code", "message", "fields?"}}`, câu `message` lấy nguyên văn M-xx từ `03-frs.md` mục 5. Mọi POST/PUT phải có header `Origin` đúng `APP_ORIGIN` (chống CSRF, GH-03), nếu không → 403.

## 6. Cấu trúc thư mục

```text
package.json            – npm workspaces: server, web
.env.example            – mẫu cấu hình, KHÔNG chứa bí mật
server/
  prisma/schema.prisma  – bảng users, sessions
  prisma/migrations/    – SQL do Prisma sinh + CHECK bổ sung tay (09 mục 3.3)
  src/config/env.ts     – đọc/kiểm tra biến môi trường
  src/common/           – errors, messages (M-xx), validation, avatar, dto, logger
  src/storage/          – CHỈ nơi này import Prisma (08 mục 4.3)
  src/modules/auth/     – register, login, logout, đổi mật khẩu, phiên, requireAuth, kiểm tra Origin
  src/modules/users/    – /api/me, /api/users
  src/modules/chat/     – membership.ts (cửa kiểm tra thành viên DUY NHẤT), chat.service, routes C1–C4, chat.socket (message:send)
  src/modules/notifications/ – realtime.ts (nơi DUY NHẤT gọi io), read.routes (C5), unread.service
  src/modules/groups/   – groups.service (G1–G5, cửa trưởng nhóm), groups.routes, system-messages (HT-01…HT-06)
  src/realtime-server.ts – gắn Socket.IO (chỉ WebSocket) vào HTTP server
  test/unit, test/integration, test/db
web/
  src/api/              – gọi REST (credentials: same-origin)
  src/lib/text.ts       – kiểm tra dữ liệu GIỐNG HỆT server
  src/realtime/socket.ts – io({ transports: ["websocket"] })
  src/pages/            – SC-01 Đăng ký, SC-02 Đăng nhập, SC-03 Trang chính, SC-04 Hội thoại (ChatPanel), SC-07 Hồ sơ, SC-08 Đổi mật khẩu
```

## 7. Lưu ý / chưa làm

- **Tài liệu thiết kế còn Draft**: ADR-01 (SQLite), ADR-02 (cookie HttpOnly), OQ-31 (cột `display_name_search`), OQ-36 (argon2id thay bcrypt) **chưa được Product Owner duyệt**. Mã đi theo đề xuất trong tài liệu.
- Người ngoài nhận **403** (theo yêu cầu review slice 2); `09` GT-08 đề xuất 404. Cả hai trường hợp (không phải thành viên / không tồn tại) cho phản hồi giống hệt nhau.
- Nhóm: không phải thành viên → 403 `CONVERSATION_FORBIDDEN` (như slice 2); là thành viên nhưng không phải trưởng nhóm → 403 `NOT_GROUP_OWNER` (M-29).
- Thêm nhiều người trong một lần: cả lần dùng chung một mốc xem (tin HT-02 đầu tiên của lần đó), để không ai thấy tin trước lúc được thêm.
- Socket.IO chạy một tiến trình (ADR-03); bản Vercel chạy nhiều instance qua Postgres adapter (OQ-28) – xem mục 8.
- Không có giới hạn số lần đăng nhập sai (PDF không yêu cầu – FRS-03 "Ngoài MVP").

- **Listbox "Mã đăng ký tổ chức" (2026-11-14):** màn hình đăng ký lấy mã từ `GET /api/auth/registration-options` và cho chọn trong listbox.
  Vì mã hiện công khai trên trang đăng ký, nó **không còn chặn người ngoài** (QĐ-05) – chờ Product Owner xác nhận.

## 8. Triển khai lên Vercel

> Bản Vercel **đổi hai quyết định thiết kế còn Draft**: CSDL PostgreSQL (Neon) thay SQLite (ADR-01) và
> Socket.IO nhiều instance qua LISTEN/NOTIFY của PostgreSQL – `@socket.io/postgres-adapter` (ADR-03, OQ-28).
> Chỉ cần MỘT kho miễn phí (Neon), không cần Redis. Cần Product Owner duyệt và cập nhật `08-high-level-design.md`.
> Local và kiểm thử **vẫn dùng SQLite** như cũ.

Thành phần:

| Tệp | Vai trò |
|---|---|
| `vercel.json` | Lệnh build, thư mục giao diện `web/dist`, chuyển `/api/*` và `/socket.io/*` vào một Function |
| `api/index.mjs` | Vercel Function duy nhất, xuất HTTP server từ `server/dist/vercel.js` |
| `server/src/vercel.ts` | Tạo Express + Socket.IO, **không** gọi `listen` |
| `server/prisma/postgres/` | Lược đồ + migration PostgreSQL (cùng model với bản SQLite) |

Lệnh build trên Vercel (`npm run build:vercel`): sinh Prisma Client cho PostgreSQL → biên dịch server
→ `prisma migrate deploy` (qua `server/scripts/migrate-postgres.mjs`) → build giao diện.

Biến môi trường trên Vercel (Project → Settings → Environment Variables):

| Biến | Nguồn |
|---|---|
| Chuỗi kết nối Neon | Tự có khi kết nối Neon từ Vercel Marketplace. Máy chủ nhận cả khi có tiền tố (`DATABASE_URL_DATABASE_URL`, `DATABASE_URL_POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`…) – danh sách ở `server/src/config/db-url.ts` |
| `REGISTRATION_CODE` | Tự đặt (≥ 8 ký tự), kiểu **Sensitive**; không ghi vào repo |
| `REGISTRATION_ORG_NAME` | Tên tổ chức hiện trong listbox ở màn hình đăng ký (mặc định "Tổ chức") |
| `APP_ORIGIN` | Địa chỉ chính thức, ví dụ `https://<tên-dự-án>.vercel.app` |
| `COOKIE_SECURE` | `true` |
| `SESSION_TTL_HOURS`, `COOKIE_NAME`, `LOG_LEVEL` | Không bắt buộc (mặc định 8, `sid`, `info`) |

Không đặt `NODE_ENV` trên Vercel (máy chủ tự hiểu là `production` khi có biến `VERCEL`).
Bản xem trước (preview) có tên miền riêng: máy chủ chấp nhận Origin là tên miền của **chính** bản deploy đó
(`VERCEL_URL`, `VERCEL_BRANCH_URL`) cùng `APP_ORIGIN`.

Giới hạn cần biết:

- Kết nối WebSocket bị đóng khi Function chạy tới thời gian tối đa (300 giây trong `vercel.json`).
  Trình duyệt tự nối lại và tải các tin bị lỡ (`after`), nên có thể thấy thông báo mất kết nối thoáng qua.
- Postgres adapter giữ một kết nối trực tiếp tới Neon khi Function đang chạy (có người đang kết nối),
  nên Neon không "ngủ" trong lúc đó – tính vào giờ chạy miễn phí của Neon.
- Thứ tự tin trong một hội thoại (GE-10) trên PostgreSQL được giữ bằng khóa dòng `conversations`
  (`SELECT … FOR UPDATE`) trong giao dịch ghi.
