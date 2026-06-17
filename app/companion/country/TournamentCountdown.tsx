// Tournament countdown card — carries the top of the Country Dashboard
// across the entire pre-kickoff arc. Used to only render in the final
// 7 days; Phase 8 extends the window to ≤30 days so the run-up has a
// deliberate anchor instead of an empty Next Match placeholder.
// Intensity ratchets up as the moment approaches.
//
// State boundaries:
//   ≤6 hours  → "kicks off in N hours" + live pip
//   ≤24 hours → "kicks off tomorrow" + accent rail
//   ≤7 days   → "starts in N days" + accent rail
//   ≤30 days  → "N days to first whistle" + neutral rail (new, Phase 8)
//   >30 days  → component returns null

import { Eyebrow } from "../atoms/Eyebrow";
import type { CountryEntry } from "../following/data/countries";

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

type CountdownState = {
  show: boolean;
  imminent: boolean;          // ≤24 hours
  starting: boolean;          // ≤6 hours
  /** True in the final week but outside the imminent window. Drives
   *  the "feel close" accent without faking urgency. */
  closeWeek: boolean;
  daysLabel: string;
  hoursLabel: string | null;
  daysRemaining: number;
};

function computeCountdown(now = new Date()): CountdownState {
  const ms = WC_KICKOFF.getTime() - now.getTime();
  if (ms <= 0) {
    return {
      show: false,
      imminent: false,
      starting: false,
      closeWeek: false,
      daysLabel: "",
      hoursLabel: null,
      daysRemaining: 0,
    };
  }
  const hours = Math.ceil(ms / 3_600_000);
  const days = Math.ceil(ms / 86_400_000);

  if (days > 30) {
    return {
      show: false,
      imminent: false,
      starting: false,
      closeWeek: false,
      daysLabel: "",
      hoursLabel: null,
      daysRemaining: days,
    };
  }

  return {
    show: true,
    imminent: hours <= 24,
    starting: hours <= 6,
    closeWeek: days <= 7 && hours > 24,
    daysLabel: days === 1 ? "Tomorrow" : `${days} days`,
    hoursLabel: hours <= 24 ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    daysRemaining: days,
  };
}

export function TournamentCountdown({ country }: { country: CountryEntry }) {
  const state = computeCountdown();
  if (!state.show) return null;

  // The calm 8–30 day band is deliberately spare: a single factual line
  // ("15 days until first whistle. Group A draw is set.") with no
  // headline. There's nothing to say yet beyond the countdown and the
  // draw, so a "getting ready" headline just added redundancy. The
  // tighter windows below still earn an eventful headline.
  const isCalm = !state.starting && !state.imminent && !state.closeWeek;

  // This card counts down to the TOURNAMENT kickoff (WC_KICKOFF), not to
  // this country's first match — so the copy must talk about the World
  // Cup starting, never "{country}'s opener". The country's actual first
  // fixture is shown separately in the Next Match card below (e.g.
  // Türkiye opens Jun 14, four days after the Jun 11 tournament start).
  const headline = state.starting
    ? `The Summer Soccer kicks off soon.`
    : state.imminent
      ? `The Summer Soccer starts tomorrow.`
      : state.closeWeek
        ? `The Summer Soccer is almost here.`
        : null;

  const detail = state.starting && state.hoursLabel
    ? `Summer Soccer starts in ${state.hoursLabel}.`
    : state.imminent
      ? "Summer Soccer starts within 24 hours."
      : state.closeWeek
        ? `${state.daysLabel} to first whistle. Group ${country.group}.`
        : `${state.daysLabel} until first whistle. Group ${country.group} draw is set.`;

  // Eyebrow label tiers — keep "Countdown" for the tighter windows
  // where days/hours are doing the talking, switch to "Pre-tournament"
  // for the calmer 8–30 day band so the eyebrow doesn't oversell.
  const eyebrowLabel = state.starting
    ? "Starting soon"
    : state.closeWeek || state.imminent
      ? "Countdown"
      : "Pre-tournament";

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>{eyebrowLabel}</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <article
        className="no-noise-tier-transition rounded-[14px] border px-4 py-4"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          // Accent left rail tightens as the moment approaches:
          //   imminent (≤24h) → 3px --wc rail (Worth-checking-now feel)
          //   close week  → 3px --wc rail (also earns the accent)
          //   8–30 days   → 1px line (calm, structural)
          borderLeft:
            state.imminent || state.closeWeek
              ? "3px solid var(--wc)"
              : "1px solid var(--line)",
        }}
      >
        {/* The countdown chip duplicates the day count already in the
            calm-tier detail line, so it only renders for the tighter,
            more eventful windows. */}
        {!isCalm ? (
          <div className="flex items-center gap-2">
            {state.starting ? (
              <span
                aria-hidden
                className="no-noise-live-fade h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--live)" }}
              />
            ) : null}
            <Eyebrow
              color={
                state.imminent || state.closeWeek
                  ? "var(--wc)"
                  : "var(--mute-1)"
              }
            >
              {state.daysLabel}
            </Eyebrow>
          </div>
        ) : null}

        {headline ? (
          <p
            className="mt-2 text-[20px] leading-snug"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.005em",
            }}
          >
            {headline}
          </p>
        ) : null}

        {/* Calm tier: this single line is the whole card, so it reads as
            ink body copy rather than a muted sub-line. */}
        <p
          className={isCalm ? "text-[15px] leading-snug" : "mt-2 text-[13px] leading-snug"}
          style={{
            color: isCalm ? "var(--ink)" : "var(--mute-1)",
            fontWeight: 500,
          }}
        >
          {detail}
        </p>
      </article>
    </section>
  );
}
