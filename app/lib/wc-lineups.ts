// Pure Starting XI mapper (spec §17). No fetch here — the route hands this
// function the raw ESPN summary payload and renders whatever it returns.
//
// ESPN summary shape (verified live 2026-07-02 against
// site.api.espn.com/.../soccer/fifa.world/summary?event=): `rosters[]` carries
// one block per team with a `formation` string and a `roster[]` of players,
// each flagged `starter`. Announced matches carry exactly 11 starters per side;
// before announcement `rosters` is empty (both states are real and detectable).

export type ESPNRosterAthlete = {
  displayName?: string;
  // ESPN puts the captain flag inconsistently — sometimes on the roster entry,
  // sometimes on the nested athlete. We read both (see mapEntry).
  captain?: boolean;
};

export type ESPNRosterEntry = {
  starter?: boolean;
  jersey?: string;
  captain?: boolean;
  athlete?: ESPNRosterAthlete;
  position?: { abbreviation?: string };
  // Substitutions (verified live 2026-07-03 against event 760494): the
  // leaver carries subbedOut:true + subbedOutFor:{jersey, athlete}; the
  // entrant carries starter:false + subbedIn:true. The sub minute lives in
  // plays[] on BOTH sides as { substitution: true, clock.displayValue }.
  subbedIn?: boolean;
  subbedOut?: boolean;
  subbedOutFor?: { jersey?: string; athlete?: ESPNRosterAthlete };
  plays?: Array<{
    substitution?: boolean;
    clock?: { displayValue?: string };
  }>;
};

export type ESPNRoster = {
  team?: { abbreviation?: string };
  formation?: string;
  roster?: ESPNRosterEntry[];
};

export type ESPNLineupsResponse = {
  rosters?: ESPNRoster[];
};

export type StartingXIPlayer = {
  /** Shirt number as a string, straight from the feed ("10", "23"). */
  jersey: string;
  /** Surname for the programme row (see surnameOf for the extraction law). */
  name: string;
  captain: boolean;
  /** Set when this starter was substituted off — the match minute as the
   *  feed writes it ("62'", "90'+5'"). Absent = played on / not yet subbed. */
  subbedOffMinute?: string;
};

export type XISub = {
  jersey: string;
  name: string;
  /** Minute the entrant came on, from their plays[] substitution entry. */
  minute: string;
};

export type StartingXITeam = {
  code: string;
  formation: string;
  starters: StartingXIPlayer[];
  /** Entrants, feed order (chronological). Empty until subs happen. */
  subs: XISub[];
};

export type WCLineups = { teams: StartingXITeam[] } | { pending: true };

// Surname for the programme row. Law: strip the FIRST whitespace token (the
// given name) and keep the rest joined. This is deliberately NOT "last token":
// "Virgil van Dijk" must read "van Dijk", not "Dijk". "Arda Güler" → "Güler",
// "Weston McKennie" → "McKennie". A single-token name ("Neymar", "Danilo") is
// returned whole. Diacritics are preserved (no normalization).
export function surnameOf(displayName: string | undefined): string {
  const tokens = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return tokens.slice(1).join(" ");
}

// Goalkeeper detection from ESPN's position abbreviation. Soccer positions come
// through as G / D / M / F; we tolerate "GK" too. Absent position data returns
// false, which keeps that team in feed order (no reshuffle).
function isGoalkeeper(positionAbbr: string | undefined): boolean {
  const p = (positionAbbr ?? "").trim().toUpperCase();
  return p === "G" || p === "GK";
}

type MappedPlayer = StartingXIPlayer & { isGK: boolean };

/** Minute of the substitution play, when the feed carries one. */
function subMinuteOf(entry: ESPNRosterEntry): string | undefined {
  const play = (entry.plays ?? []).find((p) => p.substitution === true);
  const raw = (play?.clock?.displayValue ?? "").trim();
  return raw || undefined;
}

function mapEntry(entry: ESPNRosterEntry): MappedPlayer {
  const player: MappedPlayer = {
    jersey: (entry.jersey ?? "").toString().trim(),
    name: surnameOf(entry.athlete?.displayName),
    captain: entry.captain === true || entry.athlete?.captain === true,
    isGK: isGoalkeeper(entry.position?.abbreviation),
  };
  if (entry.subbedOut === true) {
    const minute = subMinuteOf(entry);
    if (minute) player.subbedOffMinute = minute;
  }
  return player;
}

// GK-first ordering (spec §17: "GK first, defense → attack order"). We only
// have reliable goalkeeper data, so we float the keeper(s) to the top and keep
// everyone else in feed order (ESPN already lists defense → attack). When no
// position data is present we leave the feed order untouched.
function orderGKFirst(players: MappedPlayer[]): MappedPlayer[] {
  if (!players.some((p) => p.isGK)) return players;
  const gk = players.filter((p) => p.isGK);
  const rest = players.filter((p) => !p.isGK);
  return [...gk, ...rest];
}

function mapTeam(roster: ESPNRoster): StartingXITeam {
  const entries = roster.roster ?? [];
  const starters = entries
    .filter((entry) => entry.starter === true)
    .map(mapEntry);
  // Entrants: bench players the feed marks subbedIn. Feed order is
  // chronological; minute comes from their own substitution play.
  const subs: XISub[] = entries
    .filter((entry) => entry.starter !== true && entry.subbedIn === true)
    .map((entry) => ({
      jersey: (entry.jersey ?? "").toString().trim(),
      name: surnameOf(entry.athlete?.displayName),
      minute: subMinuteOf(entry) ?? "",
    }));
  return {
    code: (roster.team?.abbreviation ?? "").trim(),
    formation: (roster.formation ?? "").trim(),
    // Project to the public shape once ordering is settled (drops isGK).
    starters: orderGKFirst(starters).map((p) => ({
      jersey: p.jersey,
      name: p.name,
      captain: p.captain,
      ...(p.subbedOffMinute ? { subbedOffMinute: p.subbedOffMinute } : {}),
    })),
    subs,
  };
}

// Map the ESPN summary payload to the render-ready lineups, or `{ pending: true }`
// when the announcement isn't complete. "Announced" = both sides present with
// exactly 11 starters (empty or partial rosters render the pending state, never
// placeholder names — spec §17).
export function mapLineups(data: ESPNLineupsResponse): WCLineups {
  const teams = (data.rosters ?? []).map(mapTeam);
  const announced =
    teams.length === 2 && teams.every((team) => team.starters.length === 11);
  return announced ? { teams } : { pending: true };
}
