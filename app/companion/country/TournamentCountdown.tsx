// Tournament countdown card — appears at the top of the Country Dashboard
// in the final 7 days before WC kickoff. Designed to feel like a calm
// scoreboard module that intensifies (subtly) as the moment approaches.
//
// State boundaries:
//   ≤6 hours  → "kicks off in N hours" + live pip
//   ≤24 hours → "kicks off tomorrow" + accent rail
//   ≤7 days   → "starts in N days" + neutral chip
//   >7 days   → component returns null (the regular Next Match block carries the screen)

import { Eyebrow } from "../atoms/Eyebrow";
import type { CountryEntry } from "../following/data/countries";

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

type CountdownState = {
  show: boolean;
  imminent: boolean;          // ≤24 hours
  starting: boolean;           // ≤6 hours
  daysLabel: string;
  hoursLabel: string | null;
};

function computeCountdown(now = new Date()): CountdownState {
  const ms = WC_KICKOFF.getTime() - now.getTime();
  if (ms <= 0) {
    return { show: false, imminent: false, starting: false, daysLabel: "", hoursLabel: null };
  }
  const hours = Math.ceil(ms / 3_600_000);
  const days = Math.ceil(ms / 86_400_000);

  if (days > 7) {
    return { show: false, imminent: false, starting: false, daysLabel: "", hoursLabel: null };
  }

  return {
    show: true,
    imminent: hours <= 24,
    starting: hours <= 6,
    daysLabel: days === 1 ? "Tomorrow" : `${days} days`,
    hoursLabel: hours <= 24 ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
  };
}

export function TournamentCountdown({ country }: { country: CountryEntry }) {
  const state = computeCountdown();
  if (!state.show) return null;

  const headline = state.starting
    ? `${country.name} kicks off soon.`
    : state.imminent
      ? `${country.name}'s opener is tomorrow.`
      : `${country.name} opens the tournament.`;

  const detail = state.starting && state.hoursLabel
    ? `World Cup starts in ${state.hoursLabel}.`
    : state.imminent
      ? "World Cup starts within 24 hours."
      : `${state.daysLabel} to first whistle. Group ${country.group}.`;

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>{state.starting ? "Starting soon" : "Countdown"}</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <article
        className="rounded-[14px] border px-4 py-4"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          // Accent left rail only when imminent — the "Worth checking now"
          // moment from HANDOFF.md applied to a country's opener.
          borderLeft: state.imminent
            ? "3px solid var(--wc)"
            : "1px solid var(--line)",
        }}
      >
        <div className="flex items-center gap-2">
          {state.starting ? (
            <span
              aria-hidden
              className="no-noise-live-fade h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--live)" }}
            />
          ) : null}
          <Eyebrow color={state.imminent ? "var(--wc)" : "var(--mute-1)"}>
            {state.daysLabel}
          </Eyebrow>
        </div>

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

        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {detail}
        </p>
      </article>
    </section>
  );
}
