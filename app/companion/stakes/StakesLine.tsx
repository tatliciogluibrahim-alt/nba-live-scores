"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import type { Stake } from "./derive-stakes";

// Compact stakes line. Eyebrow + sentence on a single calm row — no
// card, no rail. Renders as inline body copy under the relevant
// section header (Series block on game detail, PathTimeline on
// country detail, etc.) so it reads as natural editorial context
// rather than a new module.
//
// When the user has No-Spoilers on, spoilery stakes wrap in <Spoiler>
// (blur-and-reveal). Non-spoilery stakes (structural facts like
// "best-of-seven") always render visible.

export function StakesLine({
  stake,
  ariaSubject,
}: {
  stake: Stake | null;
  /** Passed through to <Spoiler> for the screen-reader reveal hint
   *  (e.g. "Knicks vs Cavaliers"). Falls back to a generic label
   *  when not supplied. */
  ariaSubject?: string;
}) {
  const noSpoilers = useNoSpoilers();
  if (!stake) return null;

  const shouldRedact = noSpoilers && stake.spoilery;

  return (
    <div className="mt-3 px-1">
      <div className="flex items-baseline gap-2">
        <Eyebrow>{stake.eyebrow}</Eyebrow>
        <p
          className="text-[13px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 500 }}
        >
          {shouldRedact ? (
            <Spoiler ariaSubject={ariaSubject ?? "game state"}>
              {stake.line}
            </Spoiler>
          ) : (
            stake.line
          )}
        </p>
      </div>
    </div>
  );
}
