import { describe, it, expect } from "vitest";
import {
  mapLineups,
  surnameOf,
  orderLineupTeams,
  type ESPNLineupsResponse,
  type ESPNRosterEntry,
  type StartingXITeam,
} from "./wc-lineups";

// ── Fixtures ────────────────────────────────────────────────────────────────
// Hand-written from the shape of a real ESPN
// soccer/fifa.world/summary?event= response (verified live 2026-07-02). Two
// sides, 13-man rosters (11 starters + 2 subs each), jerseys as strings, one
// captain per side — and the two captain-flag locations ESPN uses in the wild:
// NED marks it on the roster ENTRY, TUR on the nested ATHLETE.

function starter(
  jersey: string,
  displayName: string,
  positionAbbr: string,
  extra: Partial<ESPNRosterEntry> = {}
): ESPNRosterEntry {
  return {
    starter: true,
    jersey,
    athlete: { displayName },
    position: { abbreviation: positionAbbr },
    ...extra,
  };
}

function sub(jersey: string, displayName: string): ESPNRosterEntry {
  return {
    starter: false,
    jersey,
    athlete: { displayName },
    position: { abbreviation: "M" },
  };
}

// NED: keeper listed 4th in feed order (exercises GK-first reorder). Captain
// flag on the roster entry. Includes a multi-word surname ("Virgil van Dijk")
// and a single-token name ("Danilo").
const NED_STARTERS: ESPNRosterEntry[] = [
  starter("6", "Stefan de Vrij", "D"),
  starter("22", "Denzel Dumfries", "D"),
  starter("17", "Daley Blind", "D"),
  starter("1", "Bart Verbruggen", "G"), // keeper, not first in feed
  starter("4", "Virgil van Dijk", "D", { captain: true }),
  starter("8", "Danilo", "M"),
  starter("21", "Frenkie de Jong", "M"),
  starter("14", "Tijjani Reijnders", "M"),
  starter("11", "Cody Gakpo", "F"),
  starter("10", "Memphis Depay", "F"),
  starter("7", "Xavi Simons", "F"),
];

const TUR_STARTERS: ESPNRosterEntry[] = [
  starter("23", "Altay Bayındır", "G"),
  starter("2", "Zeki Çelik", "D"),
  starter("3", "Merih Demiral", "D"),
  starter("14", "Abdülkerim Bardakcı", "D"),
  starter("20", "Ferdi Kadıoğlu", "D"),
  starter("6", "Orkun Kökçü", "M"),
  // Captain via the nested athlete flag (the other ESPN location).
  starter("10", "Hakan Çalhanoğlu", "M", {
    athlete: { displayName: "Hakan Çalhanoğlu", captain: true },
  }),
  starter("8", "Arda Güler", "M"),
  starter("7", "Kerem Aktürkoğlu", "F"),
  starter("21", "Kenan Yıldız", "F"),
  starter("9", "Semih Kılıçsoy", "F"),
];

const ANNOUNCED: ESPNLineupsResponse = {
  rosters: [
    {
      team: { abbreviation: "NED" },
      formation: "4-3-3",
      roster: [...NED_STARTERS, sub("12", "Mark Flekken"), sub("15", "Micky van de Ven")],
    },
    {
      team: { abbreviation: "TUR" },
      formation: "4-2-3-1",
      roster: [...TUR_STARTERS, sub("1", "Uğurcan Çakır"), sub("18", "Mert Müldür")],
    },
  ],
};

const PENDING_EMPTY: ESPNLineupsResponse = { rosters: [] };

// One side announced, the other only 10 starters flagged → still pending.
const PENDING_PARTIAL: ESPNLineupsResponse = {
  rosters: [
    { team: { abbreviation: "NED" }, formation: "4-3-3", roster: NED_STARTERS },
    {
      team: { abbreviation: "TUR" },
      formation: "4-2-3-1",
      roster: TUR_STARTERS.slice(0, 10),
    },
  ],
};

// ── surnameOf ────────────────────────────────────────────────────────────────
describe("orderLineupTeams (peer review 2026-07-11)", () => {
  const team = (code: string): StartingXITeam => ({
    code,
    formation: "4-3-3",
    starters: [],
    subs: [],
  });

  it("puts the leftCode team first regardless of feed order", () => {
    // ESPN's rosters often arrive home-first; the detail header renders
    // away-first. Columns must match the header.
    expect(orderLineupTeams([team("USA"), team("BEL")], "BEL").map((t) => t.code))
      .toEqual(["BEL", "USA"]);
    expect(orderLineupTeams([team("BEL"), team("USA")], "BEL").map((t) => t.code))
      .toEqual(["BEL", "USA"]);
  });

  it("is case-insensitive", () => {
    expect(orderLineupTeams([team("USA"), team("BEL")], "bel")[0].code).toBe("BEL");
  });

  it("keeps feed order when the code is unknown, missing, or not two teams", () => {
    expect(orderLineupTeams([team("USA"), team("BEL")], "FRA").map((t) => t.code))
      .toEqual(["USA", "BEL"]);
    expect(orderLineupTeams([team("USA"), team("BEL")], null).map((t) => t.code))
      .toEqual(["USA", "BEL"]);
    expect(orderLineupTeams([team("USA")], "USA").map((t) => t.code)).toEqual(["USA"]);
    expect(orderLineupTeams([], "USA")).toEqual([]);
  });
});

describe("surnameOf", () => {
  it("strips the first token and keeps the rest (multi-word surnames survive)", () => {
    expect(surnameOf("Virgil van Dijk")).toBe("van Dijk");
    expect(surnameOf("Arda Güler")).toBe("Güler");
    expect(surnameOf("Weston McKennie")).toBe("McKennie");
  });

  it("returns a single-token name whole", () => {
    expect(surnameOf("Neymar")).toBe("Neymar");
    expect(surnameOf("Danilo")).toBe("Danilo");
  });

  it("preserves diacritics and tolerates messy whitespace", () => {
    expect(surnameOf("Hakan Çalhanoğlu")).toBe("Çalhanoğlu");
    expect(surnameOf("  Ferdi   Kadıoğlu ")).toBe("Kadıoğlu");
    expect(surnameOf(undefined)).toBe("");
    expect(surnameOf("")).toBe("");
  });
});

// ── mapLineups ───────────────────────────────────────────────────────────────
describe("mapLineups — announced", () => {
  const result = mapLineups(ANNOUNCED);

  it("returns both teams with 11 starters each", () => {
    expect("teams" in result).toBe(true);
    if (!("teams" in result)) return;
    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].starters).toHaveLength(11);
    expect(result.teams[1].starters).toHaveLength(11);
  });

  it("carries code + formation", () => {
    if (!("teams" in result)) return;
    expect(result.teams[0].code).toBe("NED");
    expect(result.teams[0].formation).toBe("4-3-3");
    expect(result.teams[1].code).toBe("TUR");
    expect(result.teams[1].formation).toBe("4-2-3-1");
  });

  it("keeps jerseys as strings and extracts surnames", () => {
    if (!("teams" in result)) return;
    const tur = result.teams[1].starters;
    const guler = tur.find((p) => p.name === "Güler");
    expect(guler?.jersey).toBe("8");
    expect(typeof guler?.jersey).toBe("string");
  });

  it("floats the goalkeeper to the top (GK-first)", () => {
    if (!("teams" in result)) return;
    // NED's keeper is 4th in feed order; ordering must move him to row 0.
    expect(result.teams[0].starters[0].name).toBe("Verbruggen");
    expect(result.teams[0].starters[0].jersey).toBe("1");
    // TUR's keeper is already first in feed order.
    expect(result.teams[1].starters[0].name).toBe("Bayındır");
  });

  it("reads the captain flag from the roster entry (NED)", () => {
    if (!("teams" in result)) return;
    const captains = result.teams[0].starters.filter((p) => p.captain);
    expect(captains).toHaveLength(1);
    expect(captains[0].name).toBe("van Dijk");
  });

  it("reads the captain flag from the nested athlete (TUR)", () => {
    if (!("teams" in result)) return;
    const captains = result.teams[1].starters.filter((p) => p.captain);
    expect(captains).toHaveLength(1);
    expect(captains[0].name).toBe("Çalhanoğlu");
  });
});

describe("mapLineups — pending", () => {
  it("is pending when rosters are empty (pre-announcement)", () => {
    expect(mapLineups(PENDING_EMPTY)).toEqual({ pending: true });
  });

  it("is pending when a side has fewer than 11 starters", () => {
    expect(mapLineups(PENDING_PARTIAL)).toEqual({ pending: true });
  });

  it("is pending on a malformed / missing payload", () => {
    expect(mapLineups({})).toEqual({ pending: true });
  });
});

// ── Substitutions (D4 6c) — shape verified live 2026-07-03, event 760494 ──
import { mapLineups as mapLineupsSubs } from "./wc-lineups";

function subFixture() {
  const starters = (names: string[], subOutIdx: number) =>
    names.map((n, i) => ({
      starter: true,
      jersey: String(i + 1),
      athlete: { displayName: n },
      position: { abbreviation: i === 0 ? "G" : "M" },
      ...(i === subOutIdx
        ? {
            subbedOut: true,
            subbedOutFor: { jersey: "12", athlete: { displayName: "Gio Reyna" } },
            plays: [{ substitution: true, clock: { displayValue: "62'" } }],
          }
        : {}),
    }));
  const bench = [
    {
      starter: false,
      jersey: "12",
      athlete: { displayName: "Gio Reyna" },
      subbedIn: true,
      plays: [{ substitution: true, clock: { displayValue: "62'" } }],
    },
    { starter: false, jersey: "20", athlete: { displayName: "Unused Bench" } },
  ];
  const eleven = ["A Keeper", "B Two", "C Three", "D Four", "E Five", "F Six", "G Seven", "H Eight", "I Nine", "J Ten", "K Eleven"];
  return {
    rosters: [
      { team: { abbreviation: "USA" }, formation: "4-3-3", roster: [...starters(eleven, 5), ...bench] },
      { team: { abbreviation: "BIH" }, formation: "5-3-2", roster: starters(eleven, -1) },
    ],
  };
}

describe("substitutions", () => {
  it("marks the subbed-off starter with the play minute", () => {
    const r = mapLineupsSubs(subFixture() as never);
    if (!("teams" in r)) throw new Error("expected teams");
    const usa = r.teams.find((t) => t.code === "USA")!;
    const off = usa.starters.find((p) => p.subbedOffMinute);
    expect(off?.subbedOffMinute).toBe("62'");
  });
  it("lists entrants under subs with jersey, surname, minute", () => {
    const r = mapLineupsSubs(subFixture() as never);
    if (!("teams" in r)) throw new Error("expected teams");
    const usa = r.teams.find((t) => t.code === "USA")!;
    expect(usa.subs).toEqual([{ jersey: "12", name: "Reyna", minute: "62'" }]);
  });
  it("no subs → empty subs array, no starter marks", () => {
    const r = mapLineupsSubs(subFixture() as never);
    if (!("teams" in r)) throw new Error("expected teams");
    const bih = r.teams.find((t) => t.code === "BIH")!;
    expect(bih.subs).toEqual([]);
    expect(bih.starters.every((p) => !p.subbedOffMinute)).toBe(true);
  });
});
