import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formatWinPercent, normalizeNFLStandings } from "./normalize";

// The fixture is a REAL ESPN capture (2026-10-11, Week 5, mid 1 PM slate),
// trimmed of logos, links and stat descriptions only. Every record asserted
// below is what ESPN served at capture time. Synthetic edits are made on a
// clone and say so in the test name.
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../scripts/fixtures/nfl-standings-2026-10-11.json",
      import.meta.url
    ),
    "utf8"
  )
);

type RawStat = {
  name?: string;
  type?: string;
  value?: number;
  displayValue?: string;
  summary?: string;
};
type RawEntry = { team: { abbreviation: string }; stats: RawStat[] };

function clone() {
  return JSON.parse(JSON.stringify(fixture));
}

/** A raw entry inside a cloned fixture, by team code. */
function rawEntry(raw: ReturnType<typeof clone>, code: string): RawEntry {
  for (const conf of raw.children) {
    for (const div of conf.children) {
      const hit = (div.standings.entries as RawEntry[]).find(
        (e) => e.team.abbreviation === code
      );
      if (hit) return hit;
    }
  }
  throw new Error(`no ${code} in fixture`);
}

function stat(entry: RawEntry, type: string): RawStat {
  const s = entry.stats.find((x) => x.type === type);
  if (!s) throw new Error(`no ${type} stat`);
  return s;
}

describe("normalizeNFLStandings: the real Week 5 capture", () => {
  it("groups 32 teams into two conferences of four divisions", () => {
    const s = normalizeNFLStandings(fixture)!;
    expect(s).not.toBeNull();
    expect(s.conferences.map((c) => c.abbreviation)).toEqual(["AFC", "NFC"]);
    expect(s.conferences.map((c) => c.divisions.map((d) => d.name))).toEqual([
      ["AFC East", "AFC North", "AFC South", "AFC West"],
      ["NFC East", "NFC North", "NFC South", "NFC West"],
    ]);
    const teams = s.conferences.flatMap((c) =>
      c.divisions.flatMap((d) => d.teams)
    );
    expect(teams).toHaveLength(32);
    expect(new Set(teams.map((t) => t.abbreviation)).size).toBe(32);
  });

  it("echoes the season and season type ESPN served", () => {
    const s = normalizeNFLStandings(fixture)!;
    expect(s.season).toBe(2026);
    expect(s.seasonType).toBe(2);
  });

  it("keeps ESPN's division order and records (AFC North)", () => {
    const s = normalizeNFLStandings(fixture)!;
    const north = s.conferences[0].divisions[1];
    expect(
      north.teams.map((t) => [
        t.abbreviation,
        t.wins,
        t.losses,
        t.ties,
        t.winPercentText,
        t.divisionRecord,
      ])
    ).toEqual([
      // CLE over BAL at 3-1 is ESPN's tiebreak (1-0 in the division).
      ["CLE", 3, 1, 0, ".750", "1-0"],
      ["BAL", 3, 1, 0, ".750", "0-0"],
      ["PIT", 2, 2, 0, ".500", "1-1"],
      ["CIN", 2, 2, 0, ".500", "0-1"],
    ]);
    expect(north.teams[2]).toMatchObject({
      displayName: "Pittsburgh Steelers",
      shortName: "Steelers",
    });
  });

  it("formats perfect, winless and five-game percentages NFL style", () => {
    const s = normalizeNFLStandings(fixture)!;
    const all = s.conferences.flatMap((c) =>
      c.divisions.flatMap((d) => d.teams)
    );
    const by = (code: string) => all.find((t) => t.abbreviation === code)!;
    expect(by("KC").winPercentText).toBe("1.000");
    expect(by("MIA").winPercentText).toBe(".000");
    expect(by("TB")).toMatchObject({ wins: 1, losses: 4, winPercentText: ".200" });
    expect(by("PHI")).toMatchObject({ wins: 2, losses: 3, winPercentText: ".400" });
  });
});

describe("normalizeNFLStandings: ties and guards", () => {
  it("carries a tie into the record and the percentage (synthetic edit of PIT)", () => {
    const raw = clone();
    const pit = rawEntry(raw, "PIT");
    stat(pit, "wins").value = 2;
    stat(pit, "losses").value = 1;
    stat(pit, "ties").value = 1;
    stat(pit, "total").summary = "2-1-1";
    stat(pit, "total").displayValue = "2-1-1";
    stat(pit, "winpercent").value = 0.625;
    const s = normalizeNFLStandings(raw)!;
    const team = s.conferences[0].divisions[1].teams.find(
      (t) => t.abbreviation === "PIT"
    )!;
    expect(team).toMatchObject({ wins: 2, losses: 1, ties: 1, winPercentText: ".625" });
  });

  it("drops a malformed division record instead of guessing (synthetic edit)", () => {
    const raw = clone();
    const pit = rawEntry(raw, "PIT");
    stat(pit, "vsdiv").summary = "n/a";
    stat(pit, "vsdiv").displayValue = "n/a";
    stat(pit, "divisionrecord").displayValue = "n/a";
    const s = normalizeNFLStandings(raw)!;
    const team = s.conferences[0].divisions[1].teams.find(
      (t) => t.abbreviation === "PIT"
    )!;
    expect(team.divisionRecord).toBeNull();
    expect(team.wins).toBe(2);
  });

  it("drops a division record with more games than the team has played (synthetic edit)", () => {
    const raw = clone();
    const pit = rawEntry(raw, "PIT");
    stat(pit, "vsdiv").summary = "5-0";
    stat(pit, "vsdiv").displayValue = "5-0";
    const s = normalizeNFLStandings(raw)!;
    const team = s.conferences[0].divisions[1].teams.find(
      (t) => t.abbreviation === "PIT"
    )!;
    expect(team.divisionRecord).toBeNull();
  });

  it("refuses the table when ESPN's overall record contradicts its W/L stats", () => {
    const raw = clone();
    stat(rawEntry(raw, "PIT"), "wins").value = 3;
    expect(normalizeNFLStandings(raw)).toBeNull();
  });

  it("refuses the table when a team's record is missing", () => {
    const raw = clone();
    const pit = rawEntry(raw, "PIT");
    pit.stats = pit.stats.filter((x) => x.type !== "losses");
    expect(normalizeNFLStandings(raw)).toBeNull();
  });

  it("refuses the table when the percentage contradicts the record", () => {
    const raw = clone();
    stat(rawEntry(raw, "PIT"), "winpercent").value = 0.9;
    expect(normalizeNFLStandings(raw)).toBeNull();
  });

  it("derives the percentage from the record when ESPN omits it", () => {
    const raw = clone();
    const pit = rawEntry(raw, "PIT");
    pit.stats = pit.stats.filter((x) => x.type !== "winpercent");
    const s = normalizeNFLStandings(raw)!;
    const team = s.conferences[0].divisions[1].teams.find(
      (t) => t.abbreviation === "PIT"
    )!;
    expect(team.winPercentText).toBe(".500");
  });

  it("refuses duplicate teams", () => {
    const raw = clone();
    rawEntry(raw, "CIN").team.abbreviation = "PIT";
    expect(normalizeNFLStandings(raw)).toBeNull();
  });

  it("returns null for empty or malformed payloads", () => {
    expect(normalizeNFLStandings(null)).toBeNull();
    expect(normalizeNFLStandings({})).toBeNull();
    expect(normalizeNFLStandings({ children: [] })).toBeNull();
    expect(normalizeNFLStandings({ children: [{ children: [] }] })).toBeNull();
    expect(normalizeNFLStandings("standings")).toBeNull();
  });
});

describe("formatWinPercent", () => {
  it("drops the leading zero below 1 and keeps three places", () => {
    expect(formatWinPercent(1)).toBe("1.000");
    expect(formatWinPercent(0.75)).toBe(".750");
    expect(formatWinPercent(2 / 3)).toBe(".667");
    expect(formatWinPercent(0)).toBe(".000");
  });
});
