// Static NFL team directory used by the (future) NFL team picker.
// Mirrors the shape of the NBA directory in ./teams.ts — `id` is the
// ESPN abbreviation we'll key on once /api/live-scores-nfl ships.
//
// All 32 franchises, grouped by conference + division. Divisions are
// not surfaced in the v1 picker but the field is on the entry so the
// picker can later show "AFC East: BUF · MIA · NE · NYJ" sections
// without a schema change.
//
// Phase 9 scaffolding only — NFL events / cron / dispatcher don't
// exist yet. See docs/nfl-design.md for the full plan.

export type NFLDivision =
  | "AFC East"
  | "AFC West"
  | "AFC North"
  | "AFC South"
  | "NFC East"
  | "NFC West"
  | "NFC North"
  | "NFC South";

export type NFLTeamEntry = {
  id: string;          // "BUF"
  name: string;        // "Bills"
  city: string;        // "Buffalo"
  conference: "AFC" | "NFC";
  division: NFLDivision;
};

export const NFL_TEAMS: NFLTeamEntry[] = [
  // ── AFC ────────────────────────────────────────────────────────────
  // AFC East
  { id: "BUF", name: "Bills",     city: "Buffalo",      conference: "AFC", division: "AFC East" },
  { id: "MIA", name: "Dolphins",  city: "Miami",        conference: "AFC", division: "AFC East" },
  { id: "NE",  name: "Patriots",  city: "New England",  conference: "AFC", division: "AFC East" },
  { id: "NYJ", name: "Jets",      city: "New York",     conference: "AFC", division: "AFC East" },
  // AFC North
  { id: "BAL", name: "Ravens",    city: "Baltimore",    conference: "AFC", division: "AFC North" },
  { id: "CIN", name: "Bengals",   city: "Cincinnati",   conference: "AFC", division: "AFC North" },
  { id: "CLE", name: "Browns",    city: "Cleveland",    conference: "AFC", division: "AFC North" },
  { id: "PIT", name: "Steelers",  city: "Pittsburgh",   conference: "AFC", division: "AFC North" },
  // AFC South
  { id: "HOU", name: "Texans",    city: "Houston",      conference: "AFC", division: "AFC South" },
  { id: "IND", name: "Colts",     city: "Indianapolis", conference: "AFC", division: "AFC South" },
  { id: "JAX", name: "Jaguars",   city: "Jacksonville", conference: "AFC", division: "AFC South" },
  { id: "TEN", name: "Titans",    city: "Tennessee",    conference: "AFC", division: "AFC South" },
  // AFC West
  { id: "DEN", name: "Broncos",   city: "Denver",       conference: "AFC", division: "AFC West" },
  { id: "KC",  name: "Chiefs",    city: "Kansas City",  conference: "AFC", division: "AFC West" },
  { id: "LV",  name: "Raiders",   city: "Las Vegas",    conference: "AFC", division: "AFC West" },
  { id: "LAC", name: "Chargers",  city: "Los Angeles",  conference: "AFC", division: "AFC West" },

  // ── NFC ────────────────────────────────────────────────────────────
  // NFC East
  { id: "DAL", name: "Cowboys",   city: "Dallas",       conference: "NFC", division: "NFC East" },
  { id: "NYG", name: "Giants",    city: "New York",     conference: "NFC", division: "NFC East" },
  { id: "PHI", name: "Eagles",    city: "Philadelphia", conference: "NFC", division: "NFC East" },
  { id: "WSH", name: "Commanders",city: "Washington",   conference: "NFC", division: "NFC East" },
  // NFC North
  { id: "CHI", name: "Bears",     city: "Chicago",      conference: "NFC", division: "NFC North" },
  { id: "DET", name: "Lions",     city: "Detroit",      conference: "NFC", division: "NFC North" },
  { id: "GB",  name: "Packers",   city: "Green Bay",    conference: "NFC", division: "NFC North" },
  { id: "MIN", name: "Vikings",   city: "Minnesota",    conference: "NFC", division: "NFC North" },
  // NFC South
  { id: "ATL", name: "Falcons",   city: "Atlanta",      conference: "NFC", division: "NFC South" },
  { id: "CAR", name: "Panthers",  city: "Carolina",     conference: "NFC", division: "NFC South" },
  { id: "NO",  name: "Saints",    city: "New Orleans",  conference: "NFC", division: "NFC South" },
  { id: "TB",  name: "Buccaneers",city: "Tampa Bay",    conference: "NFC", division: "NFC South" },
  // NFC West
  { id: "ARI", name: "Cardinals", city: "Arizona",      conference: "NFC", division: "NFC West" },
  { id: "LAR", name: "Rams",      city: "Los Angeles",  conference: "NFC", division: "NFC West" },
  { id: "SF",  name: "49ers",     city: "San Francisco",conference: "NFC", division: "NFC West" },
  { id: "SEA", name: "Seahawks",  city: "Seattle",      conference: "NFC", division: "NFC West" },
];

export function getNFLTeam(id: string): NFLTeamEntry | undefined {
  return NFL_TEAMS.find((t) => t.id === id);
}

export function nflTeamDisplayName(id: string): string {
  const t = getNFLTeam(id);
  return t ? `${t.city} ${t.name}` : id;
}
