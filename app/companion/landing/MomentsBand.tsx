import Link from "next/link";
import { NFL_2026_SEASON_OPENER } from "../following/data/nfl-dates";
import { SectionHeader } from "./HowItWorksCapsule";

// "Built for the moments" — three moment cards, live moment first: NFL
// Season, then the wrapped NBA Playoffs and Summer Soccer 2026 as the
// track record. The product is narrow on purpose;
// this section makes that narrowness feel intentional and curated,
// not lacking.

type MomentEntry = {
  /** Stable key + the moment's name in copy. */
  sport: string;
  /** Short letter-chip label. Three characters max so it fits the 44px
   *  chip ("Summer Soccer" spilled out of it). Matches the app's
   *  hand-picked tournament chip ("SOC"), never a name slice. */
  chip: string;
  title: string;
  detail: string;
  accent: string;
  soft: string;
  /** Optional status pill, only shown when set. The wrapped moments carry
   *  their dates in the detail line instead; NFL uses it for its state. */
  status?: string;
  /** Optional deeper page for the moment. */
  link?: { href: string; label: string };
};

const MOMENTS: MomentEntry[] = [
  {
    sport: "NFL",
    chip: "NFL",
    title: "NFL Season",
    detail:
      "Follow your team through the season: kickoff and final alerts, live scores on your Lock Screen, the full week-by-week schedule. Quiet by default.",
    accent: "var(--nfl)",
    soft: "var(--nfl-soft)",
    status: nflStatus(),
    link: { href: "/nfl", label: "How it works for the NFL" },
  },
  {
    sport: "NBA",
    chip: "NBA",
    title: "NBA Playoffs",
    detail:
      "Series context, live scores by quarter, recap cards, and close-game alerts through the 2026 postseason. It wrapped in June.",
    accent: "var(--nba)",
    soft: "var(--nba-soft)",
  },
  {
    sport: "Summer Soccer",
    chip: "SOC",
    title: "Summer Soccer 2026",
    detail:
      "Country pages, the group tables, the bracket, and kickoff and full-time alerts. It ran June 11 to July 19 across the US, Canada, and Mexico.",
    accent: "var(--wc)",
    soft: "var(--wc-soft)",
  },
];

// Date-derived so this band never reads future-tense after the opener
// (Preseason Review: "Opens September 9" would have been wrong forever
// from Sep 10). Before the opener it names the date; after, it reads live.
function nflStatus(): string | undefined {
  return new Date() < new Date(NFL_2026_SEASON_OPENER.iso)
    ? `Kicks off ${NFL_2026_SEASON_OPENER.label}`
    : "In season";
}

export function MomentsBand() {
  return (
    <section
      className="px-8 py-16 md:px-12 lg:px-20"
      style={{
        background: "var(--cream-2)",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <SectionHeader
          eyebrow="Built for the moments"
          title="The events that pull you to the screen."
        />
        <p
          className="mt-4 max-w-[60ch] text-[1rem] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          NFL Sundays now. Before that, the NBA Playoffs and Summer Soccer
          2026. We add sports moment by moment, not all at once.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:gap-8">
          {MOMENTS.map((m) => (
            <article
              key={m.sport}
              className="flex flex-col rounded-[16px] border px-6 py-7"
              style={{
                background: m.soft,
                borderColor: "var(--line)",
                borderLeft: `4px solid ${m.accent}`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                {/* Letter-chip in the sport accent, matching the app's
                    tournament + follow chips (replaces an emoji ball). */}
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
                  style={{
                    background: "var(--paper)",
                    color: m.accent,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  {m.chip}
                </span>
                {m.status ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[0.625rem] uppercase"
                    style={{
                      background: "var(--paper)",
                      color: m.accent,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {m.status}
                  </span>
                ) : null}
              </div>
              {/* The sport now lives in the accent letter-chip above,
                  so the old accent eyebrow here would just repeat it
                  ("NBA" chip + "NBA" eyebrow + "NBA Playoffs" title).
                  Title leads straight from the chip. */}
              <h3
                className="mt-3 mb-2 leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                {m.title}
              </h3>
              <p
                className="text-[0.875rem] leading-snug"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {m.detail}
              </p>
              {m.link ? (
                <Link
                  href={m.link.href}
                  className="mt-5 inline-flex items-center gap-1 self-start text-[0.8125rem] transition hover:underline"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 600,
                    textUnderlineOffset: 3,
                  }}
                >
                  {m.link.label}
                  <span aria-hidden>→</span>
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
