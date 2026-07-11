import { describe, it, expect } from "vitest";
import { buildPathData, PATH_STAGES } from "./path-data";
import type { KnockoutRound, KnockoutMatch } from "./knockout-data";

// ── Fixtures ────────────────────────────────────────────────────────────

function match(over: Partial<KnockoutMatch> & { id: string }): KnockoutMatch {
  return {
    awayCode: "USA",
    awayName: "United States",
    homeCode: "CHI",
    homeName: "Chile",
    status: "upcoming",
    scoreLine: null,
    dateLabel: "Sat, Jun 28",
    timeLabel: "1:00 PM",
    href: "/game/x",
    ...over,
  };
}

const ROUND_LABELS: Record<KnockoutRound["key"], string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  third: "Third place",
  final: "Final",
};

const STATIC_ISO: Record<KnockoutRound["key"], string> = {
  r32: "2026-06-28T00:00:00Z",
  r16: "2026-07-03T00:00:00Z",
  qf: "2026-07-09T00:00:00Z",
  sf: "2026-07-14T00:00:00Z",
  third: "2026-07-18T00:00:00Z",
  final: "2026-07-19T00:00:00Z",
};

/** Build the five rounds. `withDates` toggles whether startISO is populated
 *  (so we can test the "no date" fallback). `matchesByKey` seeds matchups. */
function rounds(opts?: {
  withDates?: boolean;
  matchesByKey?: Partial<Record<KnockoutRound["key"], KnockoutMatch[]>>;
}): KnockoutRound[] {
  const withDates = opts?.withDates ?? true;
  const matchesByKey = opts?.matchesByKey ?? {};
  return (["r32", "r16", "qf", "sf", "final"] as const).map((key) => {
    const matches = matchesByKey[key] ?? [];
    return {
      key,
      label: ROUND_LABELS[key],
      dateLabel: withDates ? "Jun 28" : null,
      startISO: withDates ? STATIC_ISO[key] : null,
      matches,
      resolved: matches.length > 0,
    };
  });
}

// UTC-anchored expected phrasing, locale-agnostic (matches the impl's formatter).
function weekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    timeZone: "UTC",
  });
}
function monthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("buildPathData", () => {
  it("returns null when no WC country is followed", () => {
    expect(buildPathData(null, "group", rounds())).toBeNull();
    expect(buildPathData("", "group", rounds())).toBeNull();
  });

  it("exposes the six ordered stage labels", () => {
    expect(PATH_STAGES).toEqual(["GROUP", "R32", "R16", "QF", "SF", "FINAL"]);
  });

  it("group phase → stage 0 (GROUP), not live, next round is the R32", () => {
    const now = new Date("2026-06-24T12:00:00Z"); // within 6 days of Jun 28
    const data = buildPathData("USA", "group", rounds(), now);
    expect(data).not.toBeNull();
    expect(data!.code).toBe("USA");
    expect(data!.stageIdx).toBe(0);
    expect(data!.live).toBe(false);
    expect(data!.note).toBe(`Round of 32 starts ${weekday(STATIC_ISO.r32)}.`);
  });

  it("pre phase → stage 0 (GROUP)", () => {
    const data = buildPathData("USA", "pre", rounds(), new Date("2026-06-01T00:00:00Z"));
    expect(data!.stageIdx).toBe(0);
  });

  it("uppercases a lowercase followed code", () => {
    const data = buildPathData("usa", "group", rounds());
    expect(data!.code).toBe("USA");
  });

  it("knockout phase → stage tracks the deepest round the country reached", () => {
    // Country appears in an R16 match → they are at R16 (stageIdx 2).
    const r16 = [match({ id: "k1", awayCode: "USA", homeCode: "MEX" })];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { r16 } }));
    expect(data!.stageIdx).toBe(2);
  });

  it("knockout phase → R32 appearance only maps to stageIdx 1", () => {
    const r32 = [match({ id: "k1", awayCode: "USA", homeCode: "CHI" })];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { r32 } }));
    expect(data!.stageIdx).toBe(1);
  });

  it("knockout phase → country not yet in any resolved match defaults to R32 (stage 1)", () => {
    const data = buildPathData("USA", "knockout", rounds());
    expect(data!.stageIdx).toBe(1);
  });

  it("live flag is true when the country has a live match in any round", () => {
    const r16 = [
      match({ id: "k1", awayCode: "USA", homeCode: "MEX", status: "live" }),
    ];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { r16 } }));
    expect(data!.live).toBe(true);
  });

  it("live flag stays false when the live match does not involve the country", () => {
    const r16 = [
      match({ id: "k1", awayCode: "BRA", homeCode: "ARG", status: "live" }),
    ];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { r16 } }));
    expect(data!.live).toBe(false);
  });

  it("note uses a weekday name when the next round is within six days", () => {
    const now = new Date("2026-07-05T00:00:00Z"); // within 6 days of Jul 9 QF
    const r16 = [match({ id: "k1", awayCode: "USA", homeCode: "MEX" })];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { r16 } }), now);
    // At R16 (stage 2) → next round is the Quarterfinals (plural → "start").
    expect(data!.note).toBe(`Quarterfinals start ${weekday(STATIC_ISO.qf)}.`);
  });

  it("note uses a month/day date when the next round is more than six days out", () => {
    const now = new Date("2026-06-20T00:00:00Z"); // >6 days before Jun 28 R32
    const data = buildPathData("USA", "group", rounds(), now);
    expect(data!.note).toBe(`Round of 32 starts ${monthDay(STATIC_ISO.r32)}.`);
  });

  it("note falls back to 'Knockout schedule to come.' when no date is known", () => {
    const data = buildPathData("USA", "group", rounds({ withDates: false }));
    expect(data!.note).toBe("Knockout schedule to come.");
  });

  it("note reads 'You've reached the final.' once the country is in the final", () => {
    const final = [match({ id: "k1", awayCode: "USA", homeCode: "BRA" })];
    const data = buildPathData("USA", "knockout", rounds({ matchesByKey: { final } }));
    expect(data!.stageIdx).toBe(5);
    expect(data!.note).toBe("You've reached the final.");
  });
});
