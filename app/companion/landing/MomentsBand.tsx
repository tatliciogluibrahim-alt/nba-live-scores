import { NFL_2026_SEASON_OPENER } from "../following/data/nfl-dates";
import { SectionHeader } from "./HowItWorksCapsule";

// "Built for the moments" — three moment cards, live moment first: NFL
// Season, then the wrapped NBA Playoffs and Summer Soccer 2026 as the
// track record. The product is narrow on purpose;
// this section makes that narrowness feel intentional and curated,
// not lacking.

type MomentEntry = {
  sport: string;
  title: string;
  detail: string;
  accent: string;
  soft: string;
  /** Optional status pill — only shown when set. NBA and WC don't need
   *  one (they're live or in the pre-window); NFL uses it for the
   *  ship date. */
  status?: string;
};

const MOMENTS: MomentEntry[] = [
  {
    sport: "NFL",
    title: "NFL Season",
    detail:
      "Follow your team through the season: kickoff and final alerts, live scores on your Lock Screen, the full week-by-week schedule. Quiet by default.",
    accent: "var(--nfl)",
    soft: "var(--nfl-soft)",
    status: nflStatus(),
  },
  {
    sport: "NBA",
    title: "NBA Playoffs",
    detail:
      "Series state, dot strips, recap cards, per-quarter scores, close-game alerts. Built for the postseason.",
    accent: "var(--nba)",
    soft: "var(--nba-soft)",
  },
  {
    sport: "Summer Soccer",
    title: "Summer Soccer 2026",
    detail:
      "Country pages with your group, the path to the final, the bracket, and kickoff and full-time alerts. Live across the US, Canada, and Mexico.",
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
          className="mt-4 max-w-[60ch] text-[16px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          NBA Playoffs, the Summer Soccer, NFL Sundays. We add sports
          moment by moment, not all at once.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:gap-8">
          {MOMENTS.map((m) => (
            <article
              key={m.sport}
              className="rounded-[16px] border px-6 py-7"
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
                  className="grid h-11 w-11 place-items-center rounded-[12px]"
                  style={{
                    background: "var(--paper)",
                    color: m.accent,
                    fontFamily: "var(--font-mono)",
                    fontSize: m.sport.length > 3 ? 13 : 15,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  {m.sport}
                </span>
                {m.status ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] uppercase"
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
                className="text-[14px] leading-snug"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {m.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
