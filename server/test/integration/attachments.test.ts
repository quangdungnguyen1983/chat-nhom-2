// Tệp đính kèm (yêu cầu 2026-11-18): gửi, nhận realtime, tải về; chặn người ngoài, loại tệp lạ, tệp quá lớn.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/storage/prisma.js";
import { ORIGIN, login, register } from "../helpers/app.js";
import { startServer, waitFor, type TestServer } from "../helpers/realtime.js";

let srv: TestServer;
const u: Record<string, { id: number; cookie: string }> = {};
let conv: number;
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a0d30000000049454e44ae426082", "hex");

beforeAll(async () => {
  srv = await startServer();
  for (const [name, display] of [["file.a", "Nguyễn Văn An"], ["file.b", "Trần Thị Bình"], ["file.c", "Người Ngoài"]]) {
    const r = await register(srv.http as never, { username: name, displayName: display });
    u[name] = { id: r.body.user.id, cookie: (await login(srv.http as never, name, "Matkhau123")).cookie };
  }
  conv = (await srv.http.post("/api/conversations/direct").set("Origin", ORIGIN).set("Cookie", u["file.a"].cookie).send({ userId: u["file.b"].id })).body.conversation.id;
});
afterAll(async () => srv.close());

const upload = (who: string, body: Buffer, name: string, opts: { caption?: string; cid?: string; c?: number } = {}) => {
  const req = srv.http.post(`/api/conversations/${opts.c ?? conv}/attachments`).set("Origin", ORIGIN).set("Cookie", u[who].cookie)
    .set("Content-Type", "application/octet-stream").set("X-File-Name", encodeURIComponent(name))
    .set("X-Client-Message-Id", opts.cid ?? randomUUID());
  if (opts.caption) req.set("X-Caption", encodeURIComponent(opts.caption));
  return req.send(body);
};

describe("Gửi và tải tệp", () => {
  it("A gửi PDF kèm chú thích → lưu, B nhận realtime, B tải đúng nội dung; người ngoài không tải được", async () => {
    const b = await srv.connect(u["file.b"].cookie);
    const got = waitFor<any>(b, "message:new");
    const pdf = Buffer.from("%PDF-1.4 thử nghiệm");
    const r = await upload("file.a", pdf, "Báo cáo tháng 11.pdf", { caption: "Gửi anh chị báo cáo" });
    expect(r.status).toBe(201);
    expect(r.body.message.content).toBe("Gửi anh chị báo cáo");
    expect(r.body.message.attachment).toMatchObject({ fileName: "Báo cáo tháng 11.pdf", mimeType: "application/pdf", size: pdf.length, isImage: false });
    expect((await got).message.attachment.id).toBe(r.body.message.attachment.id);
    b.disconnect();

    const dl = await srv.http.get(`/api/attachments/${r.body.message.attachment.id}`).set("Cookie", u["file.b"].cookie).buffer(true)
      .parse((res, cb) => { const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c)); res.on("end", () => cb(null, Buffer.concat(chunks))); });
    expect(dl.status).toBe(200);
    expect(Buffer.compare(dl.body as Buffer, pdf)).toBe(0);
    expect(dl.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(dl.headers["content-security-policy"]).toContain("sandbox");

    const outsider = await srv.http.get(`/api/attachments/${r.body.message.attachment.id}`).set("Cookie", u["file.c"].cookie);
    expect(outsider.status).toBe(404);
    const anon = await srv.http.get(`/api/attachments/${r.body.message.attachment.id}`);
    expect(anon.status).toBe(401);
  });

  it("ảnh PNG thật hiển thị inline; không chú thích thì nội dung là '📎 tên tệp'; gửi lại cùng mã tạm không tạo tin trùng", async () => {
    const cid = randomUUID();
    const r = await upload("file.a", PNG, "anh.png", { cid });
    expect(r.status).toBe(201);
    expect(r.body.message).toMatchObject({ content: "📎 anh.png", attachment: { isImage: true, mimeType: "image/png" } });
    const again = await upload("file.a", PNG, "anh.png", { cid });
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(await prisma().attachment.count({ where: { messageId: r.body.message.id } })).toBe(1);
    const dl = await srv.http.get(`/api/attachments/${r.body.message.attachment.id}`).set("Cookie", u["file.b"].cookie);
    expect(dl.headers["content-disposition"]).toMatch(/^inline;/);
  });

  it("chặn: loại tệp lạ, HTML đổi tên thành .png, tệp rỗng, quá 4 MB, người ngoài gửi vào hội thoại", async () => {
    const before = await prisma().message.count({ where: { conversationId: conv } });
    expect((await upload("file.a", Buffer.from("MZ"), "virus.exe")).status).toBe(415);
    expect((await upload("file.a", Buffer.from("<script>alert(1)</script>"), "anh.png")).status).toBe(415);
    expect((await upload("file.a", Buffer.alloc(0), "rong.pdf")).status).toBe(400);
    expect((await upload("file.a", Buffer.alloc(4 * 1024 * 1024 + 1, 1), "lon.pdf")).status).toBe(413);
    expect((await upload("file.c", Buffer.from("%PDF"), "x.pdf")).status).toBe(403);
    expect(await prisma().message.count({ where: { conversationId: conv } })).toBe(before);
  });

  it("danh sách tin trả thông tin tệp nhưng KHÔNG trả nội dung tệp", async () => {
    const r = await srv.http.get(`/api/conversations/${conv}/messages`).set("Cookie", u["file.b"].cookie);
    const withFile = r.body.messages.filter((m: any) => m.attachment);
    expect(withFile.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.body)).not.toContain("\"data\"");
  });
});
