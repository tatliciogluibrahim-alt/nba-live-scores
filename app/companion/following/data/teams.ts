// Static NBA team directory used by the team picker. Independent of the
// legacy monolith so the picker doesn't pull in scoreboard code.
// `id` is the ESPN abbreviation we already key on in /api/live-scores.

export type TeamEntry = {
  id: string;     // "NYK"
  name: string;   // "Knicks"
  city: string;   // "New York"
  conference: "East" | "West";
};

export const NBA_TEAMS: TeamEntry[] = [
  // Eastern Conference
  { id: "ATL", name: "Hawks", city: "Atlanta", conference: "East" },
  { id: "BOS", name: "Celtics", city: "Boston", conference: "East" },
  { id: "BKN", name: "Nets", city: "Brooklyn", conference: "East" },
  { id: "CHA", name: "Hornets", city: "Charlotte", conference: "East" },
  { id: "CHI", name: "Bulls", city: "Chicago", conference: "East" },
  { id: "CLE", name: "Cavaliers", city: "Cleveland", conference: "East" },
  { id: "DET", name: "Pistons", city: "Detroit", conference: "East" },
  { id: "IND", name: "Pacers", city: "Indiana", conference: "East" },
  { id: "MIA", name: "Heat", city: "Miami", conference: "East" },
  { id: "MIL", name: "Bucks", city: "Milwaukee", conference: "East" },
  { id: "NYK", name: "Knicks", city: "New York", conference: "East" },
  { id: "ORL", name: "Magic", city: "Orlando", conference: "East" },
  { id: "PHI", name: "76ers", city: "Philadelphia", conference: "East" },
  { id: "TOR", name: "Raptors", city: "Toronto", conference: "East" },
  { id: "WSH", name: "Wizards", city: "Washington", conference: "East" },
  // Western Conference
  { id: "DAL", name: "Mavericks", city: "Dallas", conference: "West" },
  { id: "DEN", name: "Nuggets", city: "Denver", conference: "West" },
  { id: "GS", name: "Warriors", city: "Golden State", conference: "West" },
  { id: "HOU", name: "Rockets", city: "Houston", conference: "West" },
  { id: "LAC", name: "Clippers", city: "Los Angeles", conference: "West" },
  { id: "LAL", name: "Lakers", city: "Los Angeles", conference: "West" },
  { id: "MEM", name: "Grizzlies", city: "Memphis", conference: "West" },
  { id: "MIN", name: "Timberwolves", city: "Minnesota", conference: "West" },
  { id: "NO", name: "Pelicans", city: "New Orleans", conference: "West" },
  { id: "OKC", name: "Thunder", city: "Oklahoma City", conference: "West" },
  { id: "PHX", name: "Suns", city: "Phoenix", conference: "West" },
  { id: "POR", name: "Trail Blazers", city: "Portland", conference: "West" },
  { id: "SAC", name: "Kings", city: "Sacramento", conference: "West" },
  { id: "SA", name: "Spurs", city: "San Antonio", conference: "West" },
  { id: "UTAH", name: "Jazz", city: "Utah", conference: "West" },
];

export function getTeam(id: string): TeamEntry | undefined {
  return NBA_TEAMS.find((t) => t.id === id);
}

export function teamDisplayName(id: string): string {
  const t = getTeam(id);
  return t ? `${t.city} ${t.name}` : id;
}
