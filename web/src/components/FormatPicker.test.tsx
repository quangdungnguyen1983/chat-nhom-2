import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { FormatPicker } from "./FormatPicker";
import { DEFAULT_FORMAT, formatClass, toPayload, type MessageFormat } from "../lib/message-format";

function Harness({ spy }: { spy: (f: MessageFormat) => void }) {
  const [f, setF] = useState<MessageFormat>(DEFAULT_FORMAT);
  return <FormatPicker value={f} onChange={(v) => { setF(v); spy(v); }} />;
}

describe("FormatPicker", () => {
  it("chọn phông, cỡ, màu rồi Đặt lại", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Định dạng chữ" }));
    await u.click(screen.getByRole("radio", { name: "Có chân" }));
    await u.click(screen.getByRole("radio", { name: "Rất lớn" }));
    await u.click(screen.getByRole("radio", { name: "Xanh dương" }));
    expect(spy).toHaveBeenLastCalledWith({ font: "co-chan", size: "rat-lon", color: "xanh-duong" });
    expect(screen.getByRole("radio", { name: "Xanh dương" })).toHaveAttribute("aria-checked", "true");
    await u.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(spy).toHaveBeenLastCalledWith({ font: null, size: null, color: null });
  });
});

describe("message-format", () => {
  it("toPayload bỏ mặc định; formatClass sinh đúng lớp", () => {
    expect(toPayload(DEFAULT_FORMAT)).toBeUndefined();
    expect(toPayload({ font: null, size: "lon", color: "do" })).toEqual({ size: "lon", color: "do" });
    expect(formatClass({ font: "danh-may", size: null, color: "tim" })).toBe("fmt-font-danh-may fmt-color-tim");
    expect(formatClass(null)).toBe("");
  });
});
