import { describe, it, expect } from "vitest";
import { parseHHMM, isWithinQuietHours } from "./quiet-hours";

// A fixed instant: 2026-05-31T06:30:00Z.
// In America/New_York (UTC-4 in summer) that's 02:30 local.
// In Asia/Tokyo (UTC+9) that's 15:30 local.
const T = Date.parse("2026-05-31T06:30:00Z");

describe("parseHHMM", () => {
  it("parses valid times", () => {
    expect(parseHHMM("22:00")).toBe(22 * 60);
    expect(parseHHMM("08:30")).toBe(8 * 60 + 30);
    expect(parseHHMM("00:00")).toBe(0);
  });
  it("rejects malformed values", () => {
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("9:99")).toBeNull();
    expect(parseHHMM("garbage")).toBeNull();
    expect(parseHHMM(undefined)).toBeNull();
  });
});

describe("isWithinQuietHours", () => {
  it("returns false when no window is set", () => {
    expect(isWithinQuietHours(undefined, "America/New_York", T)).toBe(false);
  });

  it("returns false when no time zone is available (safe default)", () => {
    expect(
      isWithinQuietHours({ start: "22:00", end: "08:00" }, undefined, T)
    ).toBe(false);
  });

  it("suppresses inside an overnight window (02:30 ET is in 22:00-08:00)", () => {
    expect(
      isWithinQuietHours({ start: "22:00", end: "08:00" }, "America/New_York", T)
    ).toBe(true);
  });

  it("does not suppress outside the window (15:30 Tokyo is not in 22:00-08:00)", () => {
    expect(
      isWithinQuietHours({ start: "22:00", end: "08:00" }, "Asia/Tokyo", T)
    ).toBe(false);
  });

  it("handles a same-day window (02:30 ET is in 00:00-06:00)", () => {
    expect(
      isWithinQuietHours({ start: "00:00", end: "06:00" }, "America/New_York", T)
    ).toBe(true);
    expect(
      isWithinQuietHours({ start: "03:00", end: "06:00" }, "America/New_York", T)
    ).toBe(false);
  });

  it("treats start === end as off", () => {
    expect(
      isWithinQuietHours({ start: "08:00", end: "08:00" }, "America/New_York", T)
    ).toBe(false);
  });

  it("ignores an unknown time zone (safe default)", () => {
    expect(
      isWithinQuietHours({ start: "22:00", end: "08:00" }, "Not/AZone", T)
    ).toBe(false);
  });
});
