"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { useNoSpoilers, useUserPrefs } from "../providers";
import type { TodayPayload } from "./today-data";

// QuietRecap — Stage 15F.
//
// Once-per-night calm acknowledgement. Renders at the top of Today when:
//   • the slate is complete (no live, no upcoming, ≥1 final), and
//   • the user hasn't already dismissed it today.
//
// The single-tap "Open the wrap" routes to Watching when there are pins,
// otherwise just to the wrap section that's already on Today (the
// dismiss closes the recap and lets the user scroll). Dismissal stores
// today's date (YYYY-MM-DD, local) in prefs so the recap won't bounce
// back on a screen-off / screen-on cycle.
//
// Under No-Spoilers we never name a finals count that could imply who
// played or who won — we keep the copy structural ("Tonight's slate
// wrapped.") and lose the numeric flourish.

export function QuietRecap({ payload }: { payload: TodayPayload }) {
  const noSpoilers = useNoSpoilers();
  const { prefs, markQuietRecapSeen, hydrated } = useUserPrefs();

  if (!hydrated) return null;
  if (!payload.slateComplete) return null;

  const today = todayLocalISODate();
  if (prefs.quietRecapSeenDate === today) return null;

  const finalsCount = payload.finalsCount;
  const headline =
    noSpoilers || finalsCount === 0
      ? "Tonight's slate wrapped."
      : finalsCount === 1
        ? "Tonight: 1 final."
        : `Tonight: ${finalsCount} finals.`;

  const sub = noSpoilers
    ? "Schedules stay visible. Tap when you're ready."
    : finalsCount === 1
      ? "No more alerts tonight. Tap to see it."
      : "No more alerts tonight. Tap to see the wrap.";

  return (
    <section
      aria-label="End-of-night recap"
      className="mb-4 overflow-hidden rounded-[14px] border"
      style={{
        background: "var(--ink)",
        color: "var(--cream)",
        borderColor: "var(--ink)",
      }}
    >
      <div className="px-5 pb-5 pt-6">
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            // Aligned to the canonical Eyebrow letter-spacing (0.12em)
            // so the recap's caps mono reads as part of the same
            // typographic system as every other section header.
            letterSpacing: "0.12em",
            color: "var(--cream-on-dark-tertiary)",
          }}
        >
          Recap
        </span>

        <Display
          as="h2"
          size="md"
          className="mt-2"
          style={{ color: "var(--cream)" }}
        >
          {headline}
        </Display>

        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: "var(--cream-on-dark-secondary)", fontWeight: 500 }}
        >
          {sub}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href="/watching"
            aria-label={
              finalsCount === 1
                ? "See tonight's final"
                : "See tonight's wrap"
            }
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--cream)",
              color: "var(--ink)",
              border: "1px solid var(--cream)",
            }}
          >
            {finalsCount === 1 ? "See it" : "See the wrap"}
          </Link>
          <button
            type="button"
            onClick={() => markQuietRecapSeen(today)}
            aria-label="Dismiss recap"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--cream)",
              border: "1px solid var(--cream-on-dark-hairline)",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

/** Today as YYYY-MM-DD in the user's local timezone. Avoids `.toISOString()`
 *  because that yields UTC, which would flip the "seen today" check across
 *  the date boundary for users on the west side of UTC. */
function todayLocalISODate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
