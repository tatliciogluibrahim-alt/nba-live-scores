import { describe, it, expect } from "vitest";
import {
  buildWCBracket,
  buildBracketRounds,
  groupBracketByDay,
  parseWinnerCode,
  bracketSlotToken,
  type BracketMatch,
  type BracketRound,
  type BracketSlot,
} from "./wc-bracket-data";
import type { WCScheduleFixture } from "../../api/world-cup/schedule/route";

function fixture(
  id: number,
  away: string,
  home: string,
  stage: string,
  status: WCScheduleFixture["status"] = "upcoming",
  as = 0,
  hs = 0
): WCScheduleFixture {
  return {
    id: String(id),
    date: "2026-06-28T19:00Z",
    status,
    statusText: "",
    stage,
    group: "",
    home: { name: home, abbreviation: home, score: hs },
    away: { name: away, abbreviation: away, score: as },
    broadcasts: [],
  };
}

function r32(
  id: number,
  away: string,
  home: string,
  status: WCScheduleFixture["status"] = "upcoming",
  as = 0,
  hs = 0
): WCScheduleFixture {
  return fixture(id, away, home, "round-of-32", status, as, hs);
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

  it("resolves ESPN winner-of codes on a real QF fixture to the feeder pairing", () => {
    const fixtures = [
      ...Array.from({ length: 16 }, (_, i) => r32(i + 1, "2A", "2B")),
      // R16 matches 1 and 2 (id order = match order) with real teams.
      fixture(17, "MEX", "POR", "round-of-16"),
      fixture(18, "FRA", "ESP", "round-of-16"),
      // QF 1, published by ESPN with raw winner codes — away/home reversed
      // vs our tree order, so resolution must follow the CODE, not the tree.
      fixture(25, "RD16 W2", "RD16 W1", "quarterfinals"),
    ];
    const b = buildWCBracket(fixtures, new Set());
    const qf1 = b.quarters[0].qf!;
    expect(qf1.away.pairToken).toBe("FRA/ESP");
    expect(qf1.away.label).toBe("Winner of France vs Spain");
    expect(qf1.home.pairToken).toBe("MEX/POR");
    expect(qf1.home.label).toBe("Winner of Mexico vs Portugal");
  });

  it("resolves synthetic upper-round placeholders from the fixed tree", () => {
    const fixtures = [
      ...Array.from({ length: 16 }, (_, i) => r32(i + 1, "2A", "2B")),
      fixture(17, "MEX", "POR", "round-of-16"),
      fixture(18, "FRA", "ESP", "round-of-16"),
      // No QF fixture published — the QF is synthesized from the tree.
    ];
    const b = buildWCBracket(fixtures, new Set());
    const qf1 = b.quarters[0].qf!;
    expect(qf1.away.pairToken).toBe("MEX/POR");
    expect(qf1.home.pairToken).toBe("FRA/ESP");
  });

  it("leaves winner-of slots unresolved when the feeder isn't a real pairing", () => {
    const fixtures = [
      ...Array.from({ length: 16 }, (_, i) => r32(i + 1, "2A", "2B")),
      // R16 match 1 still carries group-slot codes — not a real pairing.
      fixture(17, "1A", "2B", "round-of-16"),
      fixture(25, "RD16 W1", "RD16 W2", "quarterfinals"),
    ];
    const b = buildWCBracket(fixtures, new Set());
    const qf1 = b.quarters[0].qf!;
    expect(qf1.away.pairToken).toBeUndefined();
    expect(bracketSlotToken(qf1.away)).toBe("TBD");
  });
});

describe("advances feeder winners into the next round (dynamic bracket)", () => {
  // ESPN publishes knockout fixtures round-by-round, so late in the
  // tournament the next round has no fixture yet. Once a feeder is FINAL the
  // bracket must advance the actual winner into the next slot rather than sit
  // on the feeder pairing until ESPN catches up. The winner is trusted data
  // (ESPN's own flag / a decisive scoreline), never a guessed bracket.
  function qf(
    id: number,
    away: string,
    home: string,
    winnerSide: "home" | "away",
    as = 1,
    hs = 1
  ): WCScheduleFixture {
    const f = fixture(id, away, home, "quarterfinals", "final", as, hs);
    if (winnerSide === "home") f.home.winner = true;
    else f.away.winner = true;
    return f;
  }

  it("advances decided QF winners into the semifinal slots (winner flag)", () => {
    const fixtures = [
      qf(25, "MAR", "FRA", "home"), // QF1 → FRA
      qf(26, "BEL", "ESP", "home"), // QF2 → ESP
      qf(27, "ENG", "NOR", "away"), // QF3 → ENG
      qf(28, "SUI", "ARG", "home"), // QF4 → ARG
    ];
    const b = buildWCBracket(fixtures, new Set());
    const [sf1, sf2] = b.semis;
    expect(sf1.away.code).toBe("FRA");
    expect(sf1.away.real).toBe(true);
    expect(sf1.home.code).toBe("ESP");
    expect(sf1.home.real).toBe(true);
    expect(sf2.away.code).toBe("ENG");
    expect(sf2.home.code).toBe("ARG");
  });

  it("carries the followed flag onto an advanced winner", () => {
    const fixtures = [
      qf(25, "MAR", "FRA", "home"),
      qf(26, "BEL", "ESP", "home"),
    ];
    const b = buildWCBracket(fixtures, new Set(["FRA"]));
    expect(b.semis[0].away.followed).toBe(true);
  });

  it("advances the winner by a decisive scoreline when ESPN has no flag", () => {
    const fixtures = [
      fixture(25, "MAR", "FRA", "quarterfinals", "final", 0, 2), // FRA 2–0
      fixture(26, "BEL", "ESP", "quarterfinals", "final", 1, 2), // ESP 2–1
    ];
    const b = buildWCBracket(fixtures, new Set());
    expect(b.semis[0].away.code).toBe("FRA");
    expect(b.semis[0].home.code).toBe("ESP");
  });

  it("keeps the feeder pairing when a final feeder is level with no flag (never guesses)", () => {
    const fixtures = [
      fixture(25, "MAR", "FRA", "quarterfinals", "final", 1, 1), // level, no flag
      fixture(26, "BEL", "ESP", "quarterfinals", "final", 0, 2), // ESP decided
    ];
    const b = buildWCBracket(fixtures, new Set());
    expect(b.semis[0].away.real).toBe(false);
    expect(b.semis[0].away.pairToken).toBe("MAR/FRA");
    expect(b.semis[0].home.code).toBe("ESP");
    expect(b.semis[0].home.real).toBe(true);
  });

  it("still shows the pairing while the feeder is unplayed", () => {
    const fixtures = [
      fixture(25, "MAR", "FRA", "quarterfinals"), // upcoming
      fixture(26, "BEL", "ESP", "quarterfinals"),
    ];
    const b = buildWCBracket(fixtures, new Set());
    expect(b.semis[0].away.pairToken).toBe("MAR/FRA");
    expect(b.semis[0].away.real).toBe(false);
  });
});

describe("third place (peer review 2026-07-11)", () => {
  it("exposes the third-place match on the bracket", () => {
    const b = buildWCBracket(
      [fixture(97, "NED", "FRA", "3rd Place", "upcoming")],
      new Set()
    );
    expect(b.third).not.toBeNull();
    expect(b.third?.round).toBe("third");
    expect(b.third?.away.code).toBe("NED");
  });

  it("is null until ESPN publishes the fixture (never synthesized)", () => {
    const b = buildWCBracket([], new Set());
    expect(b.third).toBeNull();
  });

  it("routes the third-place match into rounds between SF and Final", () => {
    const { rounds } = buildBracketRounds(
      [fixture(97, "NED", "FRA", "3rd Place")],
      new Set()
    );
    const idx = rounds.findIndex((r) => r.key === "third");
    expect(idx).toBeGreaterThan(-1);
    expect(rounds[idx - 1]?.key).toBe("sf");
    expect(rounds[idx + 1]?.key).toBe("final");
    expect(rounds[idx].matches).toHaveLength(1);
    expect(rounds[idx].label).toBe("Third place");
  });

  it("TBDs ESPN loser codes instead of leaking jargon", () => {
    const slot: BracketSlot = {
      code: "SF L1",
      label: "To be decided",
      real: false,
      followed: false,
      score: null,
    };
    expect(bracketSlotToken(slot)).toBe("TBD");
  });
});

describe("parseWinnerCode", () => {
  it("parses ESPN and synthetic winner-of codes", () => {
    expect(parseWinnerCode("RD16 W6")).toEqual({ round: "r16", n: 6 });
    expect(parseWinnerCode("RD32 W9")).toEqual({ round: "r32", n: 9 });
    expect(parseWinnerCode("QF W1")).toEqual({ round: "qf", n: 1 });
    expect(parseWinnerCode("R16-6")).toEqual({ round: "r16", n: 6 });
    expect(parseWinnerCode("SF-2")).toEqual({ round: "sf", n: 2 });
  });

  it("returns null for real countries and group-feed codes", () => {
    expect(parseWinnerCode("MEX")).toBeNull();
    expect(parseWinnerCode("2A")).toBeNull();
    expect(parseWinnerCode("3RD")).toBeNull();
    expect(parseWinnerCode("")).toBeNull();
  });
});

describe("bracketSlotToken", () => {
  const base: BracketSlot = {
    code: "",
    label: "",
    real: false,
    followed: false,
    score: null,
  };

  it("keeps real codes and group-feed codes, resolves pairings, TBDs jargon", () => {
    expect(bracketSlotToken({ ...base, code: "MEX", real: true })).toBe("MEX");
    expect(bracketSlotToken({ ...base, code: "2A" })).toBe("2A");
    expect(
      bracketSlotToken({ ...base, code: "RD16 W6", pairToken: "NOR/BRA" })
    ).toBe("NOR/BRA");
    expect(bracketSlotToken({ ...base, code: "RD16 W6" })).toBe("TBD");
    expect(bracketSlotToken({ ...base, code: "R32-1" })).toBe("TBD");
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

  // Local-constructed dates so day grouping renders deterministically in
  // any runner timezone (one-app-day doctrine: day math is device-local).
  // Jul 4 2026 is a Saturday.
  const iso = (
    y: number,
    m: number,
    d: number,
    h: number,
    min = 0
  ): string => new Date(y, m, d, h, min).toISOString();
  const now = new Date(2026, 6, 4, 12, 0); // Sat Jul 4, local noon

  it("labels today, tomorrow, and later days; keeps the past, flagged", () => {
    const past = match(iso(2026, 6, 2, 20)); // Thu — kept, past
    const todayEarly = match(iso(2026, 6, 4, 14));
    const todayLate = match(iso(2026, 6, 4, 19));
    const tomorrow = match(iso(2026, 6, 5, 16)); // Sun
    const later = match(iso(2026, 6, 8, 16)); // Wed
    const groups = groupBracketByDay(
      [round([past, todayLate, todayEarly, tomorrow, later])],
      now
    );

    expect(groups.map((g) => g.head)).toEqual([
      "THU JUL 2",
      "TODAY",
      "TOMORROW",
      "WED JUL 8",
    ]);
    expect(groups.map((g) => g.past)).toEqual([true, false, false, false]);
    // Chronological within the day (early before late).
    expect(groups[1].matches.map((m) => m.number)).toEqual([
      todayEarly.number,
      todayLate.number,
    ]);
  });

  it("collects real-but-undated fixtures under SCHEDULE TO COME, last", () => {
    const today = match(iso(2026, 6, 4, 14));
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
