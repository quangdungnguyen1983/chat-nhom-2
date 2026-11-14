import { describe, expect, it } from "vitest";
import { dayLabel, listTime, sameDay } from "./datetime";

const now = new Date(2026, 10, 14, 10, 0); // Thứ Bảy 14/11/2026, giờ máy
const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).toISOString();

describe("GS-26 – định dạng thời gian", () => {
  it("danh sách: trong ngày HH:MM, hôm qua 'Hôm qua', cũ hơn dd/mm/yyyy", () => {
    expect(listTime(at(14, 14, 5), now)).toBe("14:05");
    expect(listTime(at(14, 0, 1), now)).toBe("00:01");
    expect(listTime(at(13, 23, 59), now)).toBe("Hôm qua");
    expect(listTime(at(12, 9, 0), now)).toBe("12/11/2026");
  });
  it("dòng ngày trong khung chat (10-ui-ux mục 11.1)", () => {
    expect(dayLabel(at(14, 8, 0), now)).toBe("Hôm nay");
    expect(dayLabel(at(13, 8, 0), now)).toBe("Hôm qua");
    expect(dayLabel(at(12, 8, 0), now)).toBe("Thứ Năm, 12/11/2026");
  });
  it("sameDay theo giờ máy", () => {
    expect(sameDay(at(14, 0, 0), at(14, 23, 59))).toBe(true);
    expect(sameDay(at(13, 23, 59), at(14, 0, 0))).toBe(false);
  });
});
