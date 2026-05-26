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
  /** Picker route this granularity opens. */
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
};

export const FOLLOW_MOMENTS: FollowMoment[] = [
  {
    id: "nba-playoffs",
    name: "NBA Playoffs",
    description: "The bracket through the Finals.",
    accent: "var(--nba)",
    icon: "🏀",
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
    name: "FIFA World Cup 2026",
    description: "48 nations through the final.",
    accent: "var(--wc)",
    icon: "⚽",
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
        detail: "All 48 nations. Group, path, and matches.",
        href: "/following/country",
      },
    ],
  },
];
