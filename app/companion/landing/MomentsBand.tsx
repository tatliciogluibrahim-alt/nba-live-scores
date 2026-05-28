import { SectionHeader } from "./HowItWorksCapsule";

// "Built for the moments" — three moment cards: NBA Playoffs, FIFA
// World Cup 2026, NFL (coming). The product is narrow on purpose;
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
    sport: "NBA",
    title: "NBA Playoffs",
    detail:
      "Series state, dot strips, recap cards, per-quarter scores, close-game alerts. Built for the postseason.",
    accent: "var(--nba)",
    soft: "var(--nba-soft)",
  },
  {
    sport: "FIFA",
    title: "World Cup 2026",
    detail:
      "Country pages with group, path-to-final, opener countdown, kickoff and full-time alerts. June 11, 2026 in Mexico City.",
    accent: "var(--wc)",
    soft: "var(--wc-soft)",
  },
  {
    sport: "NFL",
    title: "NFL Season",
    detail:
      "Sunday game tracking, drive-led highlights, possession state, weekly reminders. Lands ahead of the 2026 season opener.",
    accent: "var(--nfl, #6b7280)",
    soft: "var(--cream-2)",
    status: "Coming Aug 2026",
  },
];

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
          NBA Playoffs, the World Cup, NFL Sundays. We add sports
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
