"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";
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
  revealId,
  contextSnippet,
}: {
  stake: Stake | null;
  /** Passed through to <Spoiler> for the screen-reader reveal hint
   *  (e.g. "Knicks vs Cavaliers"). Falls back to a generic label
   *  when not supplied. */
  ariaSubject?: string;
  /** When set, ties the reveal to this game's shared per-game reveal so
   *  one tap clears the whole game. Omit on non-game surfaces. */
  revealId?: string;
  /** Editorial context one-liner (the insights layer), e.g. "NYK's
   *  first Finals since 1999." Historical fact, never a live result, so
   *  it renders plainly even under No-Spoilers. The caller decides when
   *  to pass it (pre/post game only, never live). */
  contextSnippet?: string | null;
}) {
  const noSpoilers = useEffectiveNoSpoilers(revealId);
  if (!stake && !contextSnippet) return null;

  const shouldRedact = stake ? noSpoilers && stake.spoilery : false;

  return (
    <div className="mt-3 px-1">
      {stake ? (
        <div className="flex items-baseline gap-2">
          <Eyebrow>{stake.eyebrow}</Eyebrow>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 500 }}
          >
            {shouldRedact ? (
              <Spoiler ariaSubject={ariaSubject ?? "game state"} gameId={revealId}>
                {stake.line}
              </Spoiler>
            ) : (
              stake.line
            )}
          </p>
        </div>
      ) : null}

      {/* Editorial context — the insights layer. Italic, muted, always
          visible (historical fact, not a spoiler). Sits under the stake. */}
      {contextSnippet ? (
        <p
          className={stake ? "mt-1.5 text-[12px] italic leading-snug" : "text-[12px] italic leading-snug"}
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {contextSnippet}
        </p>
      ) : null}
    </div>
  );
}
