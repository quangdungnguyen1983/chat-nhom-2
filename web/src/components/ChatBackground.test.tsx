import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatBackgroundPicker, useChatBackground } from "./ChatBackground";

function Harness() {
  const [bg, setBg] = useChatBackground(7);
  return (<><ChatBackgroundPicker value={bg} onChange={setBg} /><div data-testid="log" data-bg={bg} /></>);
}

describe("Hình nền khung chat", () => {
  beforeEach(() => localStorage.clear());

  it("mặc định Lá tre; chọn Trời đêm thì đổi nền và lưu theo người dùng", async () => {
    const { unmount } = render(<Harness />);
    const u = userEvent.setup();
    expect(screen.getByTestId("log")).toHaveAttribute("data-bg", "tre");
    await u.click(screen.getByRole("button", { name: "Đổi hình nền khung chat" }));
    await u.click(screen.getByRole("radio", { name: "Trời đêm" }));
    expect(screen.getByRole("radio", { name: "Trời đêm" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("log")).toHaveAttribute("data-bg", "dem");
    expect(localStorage.getItem("chat-bg:7")).toBe("dem");
    unmount();
    render(<Harness />);
    expect(screen.getByTestId("log")).toHaveAttribute("data-bg", "dem");
  });

  it("giá trị lạ trong bộ nhớ → về mặc định", () => {
    localStorage.setItem("chat-bg:7", "khong-co");
    render(<Harness />);
    expect(screen.getByTestId("log")).toHaveAttribute("data-bg", "tre");
  });
});
