// Tournament directory. Two entries in v1. Add more when a new sports
// moment ships — never auto-generate from a feed.

export type TournamentEntry = {
  id: string;       // "nba-playoffs-2025"
  name: string;     // "NBA Playoffs"
  detail: string;   // "Best-of-7 series · East and West"
  accent: "var(--nba)" | "var(--wc)";
};

export const TOURNAMENTS: TournamentEntry[] = [
  {
    id: "nba-playoffs-2025",
    name: "NBA Playoffs",
    detail: "Best-of-7 series · East and West",
    accent: "var(--nba)",
  },
  {
    id: "fifa-world-cup-2026",
    name: "FIFA World Cup 2026",
    detail: "48 nations · group stage through the final",
    accent: "var(--wc)",
  },
];

export function getTournament(id: string): TournamentEntry | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}
