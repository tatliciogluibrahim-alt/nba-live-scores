import { describe, it, expect } from "vitest";
import {
  buildWCBracket,
  groupBracketByDay,
  type BracketMatch,
  type BracketRound,
  type BracketSlot,
} from "./wc-bracket-data";
import type { WCScheduleFixture } from "../../api/world-cup/schedule/route";

function r32(
  id: number,
  away: string,
  home: string,
  status: WCScheduleFixture["status"] = "upcoming",
  as = 0,
  hs = 0
): WCScheduleFixture {
  return {
    id: String(id),
    date: "2026-06-28T19:00Z",
    status,
    statusText: "",
    stage: "round-of-32",
    group: "",
    home: { name: home, abbreviation: home, score: hs },
    away: { name: away, abbreviation: away, score: as },
    broadcasts: [],
  };
}

describe("buildWCBracket", () => {
  it("groups 16 R32 matches into 4 quarters by the fixed tree, and resolves", () => {
    // ids 1..16 -> R32 match numbers 1..16 by id order.
    const fixtures = Array.from({ length: 16 }, (_, i) => r32(i + 1, `2A`, `2B`));
    const b = buildWCBracket(fixtures, new Set());

    expect(b.resolved).toBe(true);
    expect(b.quarters).toHaveLength(4);
    expect(b.quarters[0].r32.map((m) => m.number)).toEqual([1, 3, 2, 5]);
    expect(b.quarters[1].r32.map((m) => m.number)).toEqual([11, 12, 9, 10]);
    expect(b.quarters[2].r32.map((m) => m.number)).toEqual([4, 6, 7, 8]);
    expect(b.quarters[3].r32.map((m) => m.number)).toEqual([14, 16, 13, 15]);
    expect(b.quarters[0].r16.map((m) => m.number)).toEqual([1, 2]);
    expect(b.quarters[0].qf?.number).toBe(1);
    expect(b.semis).toHaveLength(2);
    expect(b.final).not.toBeNull();
  });

  it("maps real countries, slot placeholders, and followed flags", () => {
    const fixtures = Array.from({ length: 16 }, (_, i) =>
      i === 0 ? r32(1, "MEX", "POR") : r32(i + 1, "2A", "2B")
    );
    const b = buildWCBracket(fixtures, new Set(["MEX"]));

    const m1 = b.quarters[0].r32.find((m) => m.number === 1)!;
    expect(m1.away.real).toBe(true);
    expect(m1.away.label).toBe("Mexico");
    expect(m1.away.followed).toBe(true);
    expect(b.quarters[0].hasFollowed).toBe(true);

    const m3 = b.quarters[0].r32.find((m) => m.number === 3)!;
    expect(m3.away.real).toBe(false);
    expect(m3.away.label).toBe("Group A runner-up");
  });

  it("carries a played match's score onto the slots", () => {
    const fixtures = Array.from({ length: 16 }, (_, i) =>
      i === 0 ? r32(1, "MEX", "POR", "final", 2, 1) : r32(i + 1, "2A", "2B")
    );
    const b = buildWCBracket(fixtures, new Set());
    const m1 = b.quarters[0].r32.find((m) => m.number === 1)!;
    expect(m1.status).toBe("final");
    expect(m1.away.score).toBe(2);
    expect(m1.home.score).toBe(1);
  });

  it("is unresolved with fewer than 16 R32 fixtures", () => {
    const b = buildWCBracket([r32(1, "2A", "2B")], new Set());
    expect(b.resolved).toBe(false);
    // structure still renders (placeholders), 4 quarters present
    expect(b.quarters).toHaveLength(4);
  });
});

describe("groupBracketByDay", () => {
  let n = 0;
  function match(
    dateIso: string | null,
    opts: { real?: boolean; href?: string | null } = {}
  ): BracketMatch {
    const { real = true, href = "/game/x" } = opts;
    const slot: BracketSlot = {
      code: real ? "MEX" : "R32-1",
      label: real ? "Mexico" : "To be decided",
      real,
      followed: false,
      score: null,
    };
    return {
      round: "r32",
      number: ++n,
      away: slot,
      home: { ...slot, code: real ? "POR" : "R32-1" },
      status: "upcoming",
      dateLabel: dateIso,
      dateIso,
      href,
    };
  }
  const round = (matches: BracketMatch[]): BracketRound => ({
    key: "r32",
    label: "Round of 32",
    matches,
    dateLabel: null,
  });

  // Fixed clock: Sat Jul 4 2026, noon ET (16:00 UTC, EDT = UTC-4).
  const now = new Date("2026-07-04T16:00:00Z");

  it("labels today, tomorrow, and later days; drops the past", () => {
    const past = match("2026-07-02T20:00:00Z"); // Thu — dropped
    const todayEarly = match("2026-07-04T18:00:00Z"); // 2 PM ET
    const todayLate = match("2026-07-04T23:00:00Z"); // 7 PM ET
    const tomorrow = match("2026-07-05T20:00:00Z"); // Sun
    const later = match("2026-07-08T20:00:00Z"); // Wed
    const groups = groupBracketByDay(
      [round([past, todayLate, todayEarly, tomorrow, later])],
      now
    );

    expect(groups.map((g) => g.head)).toEqual([
      "TODAY",
      "TOMORROW",
      "WED JUL 8",
    ]);
    // Chronological within the day (early before late).
    expect(groups[0].matches.map((m) => m.number)).toEqual([
      todayEarly.number,
      todayLate.number,
    ]);
  });

  it("collects real-but-undated fixtures under SCHEDULE TO COME, last", () => {
    const today = match("2026-07-04T18:00:00Z");
    const undated = match(null, { real: true, href: "/game/y" });
    const groups = groupBracketByDay([round([today, undated])], now);

    expect(groups.map((g) => g.head)).toEqual(["TODAY", "SCHEDULE TO COME"]);
    expect(groups[1].matches).toHaveLength(1);
  });

  it("drops pure structural placeholders (no teams, no link, no date)", () => {
    const placeholder = match(null, { real: false, href: null });
    const groups = groupBracketByDay([round([placeholder])], now);
    expect(groups).toEqual([]);
  });
});
