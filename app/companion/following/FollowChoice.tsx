import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";

// Single choice card on the Following empty state and the "Follow more" sheet.
// Eyebrow + title + detail + chevron. Tap → picker route.

export function FollowChoice({
  eyebrow,
  title,
  detail,
  href,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[64px] items-center gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        color: "var(--ink)",
      }}
      aria-label={`Follow a ${title.toLowerCase()}`}
    >
      <div className="min-w-0 flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <p
          className="mt-1 text-[15px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700, letterSpacing: "-0.005em" }}
        >
          {title}
        </p>
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {detail}
        </p>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--mute-1)"
        strokeWidth="2.4"
        aria-hidden
        className="shrink-0"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// Canonical Following choice set. Used on the empty Following state
// AND the /following/add screen, so the four nouns are defined once.
// Kept as the flat fallback for any consumer that still wants the
// noun-first ordering. The moment-grouped layout (FOLLOW_MOMENTS
// below) is the canonical presentation as of Phase 8b.
export const FOLLOW_CHOICES = [
  {
    eyebrow: "Team",
    title: "Follow a team",
    detail: "NBA · 30 teams",
    href: "/following/team",
  },
  {
    eyebrow: "Country",
    title: "Follow a World Cup country",
    detail: "48 nations · group + path included",
    href: "/following/country",
  },
  {
    eyebrow: "Series",
    title: "Follow a playoff series",
    detail: "Alerts for game starts, close games, and finals",
    href: "/following/series",
  },
  {
    eyebrow: "Tournament",
    title: "Follow a tournament",
    detail: "World Cup · NBA Playoffs",
    href: "/following/tournament",
  },
];

// Moment-grouped choice set. Each moment (NBA Playoffs, FIFA WC) lists
// the granularity ladder you can pick from. Same underlying picker
// routes — this is purely a presentation reshape that makes the model
// readable at a glance: "I follow an NBA thing OR a soccer thing,
// then how much of it." Future moments (NFL Playoffs, March Madness)
// land here as new sections without changing the schema.
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
