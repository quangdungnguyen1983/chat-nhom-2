import { describe, expect, it } from "vitest";
import { checkFile, fileIcon, formatBytes, M40, M41, M42 } from "./attachments";

const f = (name: string, size: number) => new File([new Uint8Array(size)], name);

describe("checkFile", () => {
  it("nhận loại cho phép, chặn loại lạ, tệp rỗng, quá 4 MB", () => {
    expect(checkFile(f("bao-cao.PDF", 10))).toBeNull();
    expect(checkFile(f("a.exe", 10))).toBe(M41);
    expect(checkFile(f("a.png", 0))).toBe(M42);
    expect(checkFile(f("a.zip", 4 * 1024 * 1024 + 1))).toBe(M40);
  });
  it("định dạng dung lượng và biểu tượng", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(fileIcon("a.xlsx")).toBe("📗");
  });
});
