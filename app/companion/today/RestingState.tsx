"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { NextPointer } from "./sections/next-pointer";
import type { UpNextItem } from "./today-data";

// Today's RESTING state (design study C, "Next up"). Shown when nothing
// in the circle is live right now but there are games coming up. Turns
// the quiet into a stated value ("Nothing live right now. That's the
// point.") instead of an empty screen, and answers the only question a
// quiet day raises: when do my teams play next.
//
// No-Spoilers safe by construction — future games can't be spoiled, so
// this renders names / competitions / day words only, never a score.
//
// The quiet LEAD (System D, all widths — D4b). "Quiet for now." display
// headline + the calm payoff line, then an UP NEXT agate slate (SecHead +
// AgateRows). Scarcity law (spec §1): zero accent pixels on the quiet screen
// — no live dots, no accent rail, no accent day words. The masthead already
// hides its live count at 0, so the whole screen is calm ink-on-cream. On
// desktop this sits in the main column; the right rail stays quiet too.
//
// Distinct from the Dead Zone Bridge (CalmCard), which covers the
// *nothing-at-all* case (no live, no upcoming). This is the
// "quiet-but-you-have-next-games" case.

export function RestingState({ items }: { items: UpNextItem[] }) {
  // S1 (2026-07-06): today + one pointer. The resting screen shows the
  // SOONEST followed game only; the rest of the week lives on Schedule.
  const next = items[0];
  return (
    <section className="mb-5">
      <Display as="p" size="xl">
        Quiet for now.
      </Display>
      <p
        className="mt-3 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Nothing live right now. That&apos;s the point.
      </p>

      {next ? (
        <div className="mt-7">
          <NextPointer item={next} />
          <Link
            href="/schedule"
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--ink)",
            }}
          >
            Open Schedule
            <span aria-hidden style={{ color: "var(--mute-2)" }}>
              →
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
