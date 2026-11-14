# Chat nội bộ (MVP) – Vertical Slice 1: Tài khoản

Mã nguồn **Vertical Slice 1**: đăng ký (TK-01, TK-02), đăng nhập / đăng xuất (TK-03), đổi mật khẩu (TK-04), hồ sơ (TK-05), tìm người dùng (TK-06).
Thiết kế theo `08-high-level-design.md`, `09-detailed-design.md`, `10-ui-ux.md` (đều đang **Draft**, ADR chờ duyệt – xem "Lưu ý" cuối trang).

| Phần | Công nghệ (theo HLD mục 2) |
|---|---|
| Giao diện | React 19 + TypeScript + Vite (`web/`) |
| Máy chủ | Node.js + Express 5 + TypeScript (`server/`) |
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
  test/unit, test/integration, test/db
web/
  src/api/              – gọi REST (credentials: same-origin)
  src/lib/text.ts       – kiểm tra dữ liệu GIỐNG HỆT server
  src/pages/            – SC-01 Đăng ký, SC-02 Đăng nhập, SC-03 (tìm người), SC-07 Hồ sơ, SC-08 Đổi mật khẩu
```

## 7. Lưu ý / chưa làm trong slice này

- **Tài liệu thiết kế còn Draft**: ADR-01 (SQLite), ADR-02 (cookie HttpOnly), OQ-31 (cột `display_name_search`), OQ-36 (argon2id thay bcrypt) **chưa được Product Owner duyệt**. Mã đi theo đề xuất trong tài liệu.
- Chưa có realtime (Socket.IO): phần "đóng kết nối realtime khi phiên bị hủy" (TK-03 R4) và sự kiện `session:revoked` sẽ làm ở slice chat.
- Trang chính chỉ có ô tìm người; danh sách hội thoại, mở chat 1-1, tạo nhóm thuộc slice sau. Tham số `excludeConversationId` của U3 được nhận nhưng chưa có tác dụng.
- Không có giới hạn số lần đăng nhập sai (PDF không yêu cầu – FRS-03 "Ngoài MVP").
