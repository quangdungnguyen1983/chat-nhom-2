import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmojiPicker, isEmojiOnly } from "./EmojiPicker";

describe("EmojiPicker", () => {
  it("mở bảng, chọn emoji, Esc đóng và trả focus về nút", async () => {
    const onPick = vi.fn();
    render(<EmojiPicker onPick={onPick} />);
    const u = userEvent.setup();
    const toggle = screen.getByRole("button", { name: "Chèn biểu tượng cảm xúc" });
    await u.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await u.click(screen.getByRole("button", { name: "đồng ý" }));
    expect(onPick).toHaveBeenCalledWith("👍");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Biểu tượng cảm xúc" })).toBeNull();
    expect(toggle).toHaveFocus();
  });
});

describe("isEmojiOnly", () => {
  it("1–3 emoji không kèm chữ → true", () => {
    expect(isEmojiOnly("👍")).toBe(true);
    expect(isEmojiOnly("❤️🔥 🎉")).toBe(true);
    expect(isEmojiOnly("👍 ok")).toBe(false);
    expect(isEmojiOnly("😀😀😀😀")).toBe(false);
    expect(isEmojiOnly("123")).toBe(false);
  });
});
