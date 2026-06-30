import { describe, it, expect } from "vitest";
import { DESTS } from "./KeyboardShortcuts";

describe("keyboard shortcut destinations", () => {
  it("routes g t to the app entry, not the marketing root", () => {
    expect(DESTS.t).toBe("/app");
  });

  it("keeps the other destinations", () => {
    expect(DESTS.f).toBe("/following");
    expect(DESTS.w).toBe("/watching");
    expect(DESTS.h).toBe("/how-it-works");
    expect(DESTS.s).toBe("/settings");
  });
});
