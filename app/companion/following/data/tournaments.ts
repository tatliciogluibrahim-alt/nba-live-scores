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
  /** Deprecated (2026-07-20): the old static "visible but not followable"
   *  gate, used only for NFL between Phase 9 scaffolding and its activation.
   *  No entry sets it now — lifecycle is date-derived via tournamentPhase.
   *  Kept optional so the few surfaces that still branch on it compile and
   *  take the followable path. Remove once those readers are cleaned up. */
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
    // NFL Season 2026 — ACTIVATED 2026-07-20 (WC just wrapped). The picker,
    // Schedule (real Week-1 data), game detail, and event detectors are all
    // built, so NFL is a first-class followable moment now. Its lifecycle is
    // date-derived (tournament-phase.ts nflPhase → "pre" until the Sep 9
    // opener), so surfaces show a pre-season countdown rather than a live
    // state; no static comingSoon gate. Alerts stay dormant until real games.
    id: "nfl-season-2026",
    name: "NFL Season 2026",
    detail: "Regular season and playoffs · 32 teams",
    accent: "var(--nfl)",
    chip: "NFL",
  },
];

/** The Summer Soccer 2026 tournament id — the one id referenced from
 *  outside the picker (the Schedule surface). Kept next to the directory
 *  so a future id change has one home. */
export const WC_TOURNAMENT_ID = "fifa-world-cup-2026";

export function getTournament(id: string): TournamentEntry | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}
