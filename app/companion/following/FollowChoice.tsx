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
