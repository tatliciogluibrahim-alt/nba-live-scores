// Follow picker data. Two shapes lived here historically:
//
//   • FOLLOW_CHOICES — flat noun list (Team / Country / Series /
//     Tournament). Pre-Phase-8b layout. Removed: no consumers after
//     the moment-grouped restructure.
//   • FOLLOW_MOMENTS — moment-grouped ladder (NBA Playoffs →
//     Tournament / Series / Team, FIFA WC → Tournament / Country).
//     The canonical picker presentation as of Phase 8b. Same picker
//     routes underneath — the Follow record schema is unchanged.
//
// When the moment+scope schema refactor lands (see
// docs/follow-moments-design.md), this file becomes the bridge: the
// FOLLOW_MOMENTS data already names the moments and ladders so the
// new schema can map cleanly off it.

export type FollowGranularity = {
  /** Mono caps label on the granularity row. */
  eyebrow: string;
  /** Body title (e.g. "The whole tournament", "A team"). */
  title: string;
  /** One-line clarifier. */
  detail: string;
  /** Picker route this granularity opens. When the parent moment is
   *  in `comingSoon` state, the row renders as static (not tappable)
   *  and this href is ignored. */
  href: string;
};

export type FollowMoment = {
  id: string;
  /** Display name (e.g. "NBA Playoffs"). */
  name: string;
  /** Short one-line description of the moment itself. */
  description: string;
  /** Sport-accent color token used for the section's left rail. */
  accent: string;
  /** Plain-text icon glyph used in the section header. */
  icon: string;
  /** Ordered list — broadest follow first, most-specific last. The
   *  ladder is intentional: a user who's just curious can pick "Whole
   *  tournament" and walk the ladder down as their interest narrows. */
  granularities: FollowGranularity[];
  /** When set, the moment shows in the picker as discoverable but its
   *  ladder rows are static — the data layer is scaffolded but the
   *  live feed / event detection isn't wired yet. Used for NFL
   *  pre-season so users can see "NFL is coming" without being able
   *  to follow into a dead pipeline. */
  comingSoon?: {
    /** Short uppercase label rendered as a chip on the section header,
     *  e.g. "Coming Aug 2026". The single source of truth for the coming-
     *  soon label across the picker, FollowingEmpty, MomentSection, and the
     *  system-preview Gallery. */
    label: string;
  };
  /** Canonical tournament id this moment maps to, used to read its lifecycle
   *  phase. When the tournament is concluded, the moment dims + becomes
   *  non-followable in the picker (like comingSoon, but "Season wrapped"). */
  tournamentId?: string;
};

export const FOLLOW_MOMENTS: FollowMoment[] = [
  {
    id: "nba-playoffs",
    name: "NBA Playoffs",
    description: "The bracket through the Finals.",
    accent: "var(--nba)",
    icon: "🏀",
    tournamentId: "nba-playoffs-2025",
    granularities: [
      {
        eyebrow: "Tournament",
        title: "The whole tournament",
        detail: "Every series. Every game start and final.",
        href: "/following/tournament",
      },
      {
        eyebrow: "Series",
        title: "A playoff series",
        detail: "Best-of-7. East and West.",
        href: "/following/series",
      },
      {
        eyebrow: "Team",
        title: "A team",
        detail: "All 30 NBA teams.",
        href: "/following/team",
      },
    ],
  },
  {
    id: "fifa-wc-2026",
    name: "Summer Soccer 2026",
    description: "Group stage through the final.",
    accent: "var(--wc)",
    icon: "⚽",
    tournamentId: "fifa-world-cup-2026",
    granularities: [
      {
        eyebrow: "Tournament",
        title: "The whole tournament",
        detail: "Every match. Group stage through the final.",
        href: "/following/tournament",
      },
      {
        eyebrow: "Country",
        title: "A country",
        detail: "All groups, path, and matches.",
        href: "/following/country",
      },
    ],
  },
  {
    // NFL Season 2026 — followable ahead of the Sept 9 opener (Phase 22
    // gate 3). The team picker creates CANONICAL follows (nfl-team route →
    // addMomentFollow), so an NFL "LAC" never collides with the NBA one.
    // Push alerts light up with the scan loop nearer kickoff; following now
    // builds the roster so Today/the relay have an audience.
    id: "nfl-season-2026",
    name: "NFL Season 2026",
    description: "Regular season and playoffs · 32 teams.",
    accent: "var(--nfl)",
    icon: "🏈",
    tournamentId: "nfl-season-2026",
    granularities: [
      {
        eyebrow: "Season",
        title: "The whole season",
        detail: "Every game · regular season and playoffs.",
        href: "/following/tournament",
      },
      {
        eyebrow: "Team",
        title: "A team",
        detail: "All 32 NFL teams.",
        href: "/following/nfl-team",
      },
    ],
  },
];
