import { describe, it, expect } from "vitest";
import { slotState, MAX_LOCK_SCREEN_SLOTS } from "./lock-screen-slots";

describe("slotState (D2 docking slot math)", () => {
  it("empty slate: no usage, no hold, not full", () => {
    expect(slotState([], "x")).toEqual({
      used: 0,
      max: 3,
      holds: false,
      full: false,
    });
  });

  it("under cap, holder: counts itself, holds, not full", () => {
    expect(slotState(["x"], "x")).toEqual({
      used: 1,
      max: 3,
      holds: true,
      full: false,
    });
  });

  it("under cap, non-holder: counts others, no hold, not full", () => {
    expect(slotState(["a", "b"], "x")).toEqual({
      used: 2,
      max: 3,
      holds: false,
      full: false,
    });
  });

  it("at cap, holder: full is false because this game already holds a slot", () => {
    expect(slotState(["x", "b", "c"], "x")).toEqual({
      used: 3,
      max: 3,
      holds: true,
      full: false,
    });
  });

  it("at cap, non-holder: full blocks a fourth game", () => {
    expect(slotState(["a", "b", "c"], "x")).toEqual({
      used: 3,
      max: 3,
      holds: false,
      full: true,
    });
  });

  it("over cap, holder inside the first max: used clamps to max, still holds", () => {
    expect(slotState(["x", "b", "c", "d"], "x")).toEqual({
      used: 3,
      max: 3,
      holds: true,
      full: false,
    });
  });

  it("over cap, id present but beyond the first max: does not hold, full", () => {
    // "d" is the 4th entry (index 3), outside the first 3 slots.
    expect(slotState(["a", "b", "c", "d"], "d")).toEqual({
      used: 3,
      max: 3,
      holds: false,
      full: true,
    });
  });

  it("honours a custom max", () => {
    expect(slotState(["a", "b"], "a", 1)).toEqual({
      used: 1,
      max: 1,
      holds: true,
      full: false,
    });
    expect(slotState(["a", "b"], "b", 1)).toEqual({
      used: 1,
      max: 1,
      holds: false,
      full: true,
    });
  });

  it("default cap mirrors MAX_LOCK_SCREEN_SLOTS", () => {
    expect(slotState([], "x").max).toBe(MAX_LOCK_SCREEN_SLOTS);
    expect(MAX_LOCK_SCREEN_SLOTS).toBe(3);
  });
});
