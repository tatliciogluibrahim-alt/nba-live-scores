import { describe, expect, it } from "vitest";
import { localDayKey } from "./local-day";

describe("localDayKey", () => {
  it("changes at the device-local calendar boundary", () => {
    const before = new Date(2026, 6, 15, 23, 59, 59);
    const after = new Date(2026, 6, 16, 0, 0, 0);
    expect(localDayKey(before)).toBe("2026-07-15");
    expect(localDayKey(after)).toBe("2026-07-16");
  });

  it("pads single-digit months and days", () => {
    expect(localDayKey(new Date(2026, 0, 2, 12))).toBe("2026-01-02");
  });
});
