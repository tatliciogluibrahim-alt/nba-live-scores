import { describe, it, expect } from "vitest";
import { isRelayMoment, RELAY_MOMENTS } from "./moment-relay-store";

describe("isRelayMoment — closed set guards junk arming", () => {
  it("accepts the known moments", () => {
    for (const m of RELAY_MOMENTS) expect(isRelayMoment(m)).toBe(true);
    expect(isRelayMoment("nfl-2026")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isRelayMoment("nba-2027")).toBe(false);
    expect(isRelayMoment("")).toBe(false);
    expect(isRelayMoment("../../etc")).toBe(false);
  });
});
