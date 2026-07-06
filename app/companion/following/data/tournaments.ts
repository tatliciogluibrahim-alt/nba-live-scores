// Tournament directory. Add entries when a new sports moment ships.
// Never auto-generate from a feed — this list is what defines what
// the picker offers and what the dispatcher knows about.

export type TournamentEntry = {
  id: string;       // "nba-playoffs-2025"
  name: string;     // "NBA Playoffs"
  detail: string;   // "Best-of-7 series · East and West"
  accent: "var(--nba)" | "var(--wc)" | "var(--nfl)";
  /** 2–3 character chip label for compact surfaces (Today's "You follow"
   *  row, etc). Hand-picked because slicing the first 3 chars of `name`
   *  produces garbage like "FIF" for FIFA tournaments. */
  chip: string;
  /** When set, the tournament is visible in the picker but follows are
   *  disabled — the data layer is staged but the live feed / event
   *  detection isn't wired yet. Used for NFL Season 2026 between Phase
   *  9 scaffolding and Phase 12 build. */
  comingSoon?: {
    /** Short label rendered in the picker, e.g. "Coming Aug 2026". */
    label: string;
  };
};

export const TOURNAMENTS: TournamentEntry[] = [
  {
    id: "nba-playoffs-2025",
    name: "NBA Playoffs",
    detail: "Best-of-7 series · East and West",
    accent: "var(--nba)",
    chip: "NBA",
  },
  {
    // Internal id is kept stable for back-compat with stored follows; the
    // user-facing name is generic ("Summer Soccer 2026") to avoid the
    // FIFA "World Cup" trademark (App Store 5.2.1). Scores and schedules
    // are factual; the app is not affiliated with FIFA.
    id: "fifa-world-cup-2026",
    name: "Summer Soccer 2026",
    detail: "International soccer · group stage through the final",
    accent: "var(--wc)",
    chip: "SOC",
  },
  {
    // NFL Season 2026 scaffolding (Phase 9). The data layer + picker
    // surface land now so users discover NFL is coming and can browse
    // the team directory; live feed + event detection arrive in Phase
    // 12 in August. Players, big plays, and fantasy-tier defaults are
    // covered in docs/nfl-design.md.
    id: "nfl-season-2026",
    name: "NFL Season 2026",
    detail: "Regular season and playoffs · 32 teams",
    accent: "var(--nfl)",
    chip: "NFL",
    comingSoon: {
      label: "Coming Aug 2026",
    },
  },
];

/** The Summer Soccer 2026 tournament id — the one id referenced from
 *  outside the picker (the Schedule surface). Kept next to the directory
 *  so a future id change has one home. */
export const WC_TOURNAMENT_ID = "fifa-world-cup-2026";

export function getTournament(id: string): TournamentEntry | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}
