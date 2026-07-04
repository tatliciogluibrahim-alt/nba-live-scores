"use client";

import { AgateRow } from "../system/AgateRow";
import { Stamp } from "../system/Stamp";
import { winnerSide } from "../system/emphasis";
import { Spoiler } from "../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useEffectiveNoSpoilers,
  useFollowHidesGame,
} from "../spoiler/reveal";
import { usePinned, useNoSpoilers } from "../providers";
import { parseScoreLine, trackedStampText } from "./watching-data";
import type { PinnedItem, StalePin } from "./watching-data";

// Tracked rows — System D agate (D2 Task 5, all widths in D4b).
//
// The non-live pins (upcoming / final, and the single-live case) render as
// calm agate rows under TRACKED FOR LATER / WRAPPED, and stale pins under
// ARCHIVED — the same rows on mobile and desktop. The legacy PinnedCard /
// StalePinCard ScoreModule cards are retired; both widths use these rows.
// Upcoming rows carry a kickoff stamp and no score. Live / final rows carry a
// Spoiler-gated score, and finals get winner emphasis — both gated exactly
// like Today's QUIET WRAP so a followed team's result never leaks.

export function TrackedAgateRow({ item, idx }: { item: PinnedItem; idx: string }) {
  // Hooks run unconditionally (rules-of-hooks); the upcoming branch just
  // doesn't consume `hidden` since it carries no score to protect.
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame(
    item.source === "wc"
      ? { countryCodes: [item.awayCode, item.homeCode] }
      : { teamCodes: [item.awayCode, item.homeCode] }
  );
  const hidden = globalNoSpoilers || followHidden;

  // Upcoming pins have no score, so they skip the spoiler seam and render as
  // a plain agate row (kickoff time stamp, calm day-word note).
  if (item.status === "upcoming") {
    return (
      <AgateRow
        idx={idx}
        main={<TrackedMatchup away={item.awayCode} home={item.homeCode} winner={null} />}
        note={item.detailLine.split(" · ")[0] || undefined}
        stamp={<Stamp text={trackedStampText(item)} variant="faint" />}
        href={item.href}
      />
    );
  }

  return (
    <GameSpoilerScope gameId={item.id} hidden={hidden}>
      <TrackedAgateInner item={item} idx={idx} />
    </GameSpoilerScope>
  );
}

function TrackedAgateInner({ item, idx }: { item: PinnedItem; idx: string }) {
  const [awayScore, homeScore] = parseScoreLine(item.scoreLine);

  // Winner emphasis (ink winner / mute loser) IS a spoiler. Gate it on the
  // reveal-aware effective state so a tap un-mutes the loser at the same
  // instant it reveals the frosted score. Live rows get no emphasis
  // (winnerSide only fires on final), keeping "who's ahead" hidden.
  const hiddenNow = useEffectiveNoSpoilers(item.id);
  const winner = hiddenNow ? null : winnerSide(awayScore, homeScore, item.status);

  return (
    <AgateRow
      idx={idx}
      main={<TrackedMatchup away={item.awayCode} home={item.homeCode} winner={winner} />}
      score={
        <Spoiler gameId={item.id} ariaSubject={item.spoilerSubject}>
          {`${awayScore ?? 0}–${homeScore ?? 0}`}
        </Spoiler>
      }
      stamp={<Stamp text={trackedStampText(item)} variant="faint" />}
      href={item.href}
    />
  );
}

// Matchup with winner emphasis baked in for the AgateRow contract: winner
// code 800/full-ink, loser muted, a null winner (upcoming / live / draw)
// leaves both codes at the row's base weight. Mirrors QUIET WRAP's WrapMatchup.
function TrackedMatchup({
  away,
  home,
  winner,
}: {
  away: string;
  home: string;
  winner: "away" | "home" | null;
}) {
  const strong = { fontWeight: 800 };
  const weak = { color: "var(--mute-1)" };
  return (
    <span style={{ fontFamily: "var(--font-mono)" }}>
      <span style={winner === "away" ? strong : winner === "home" ? weak : undefined}>
        {away}
      </span>
      {" · "}
      <span style={winner === "home" ? strong : winner === "away" ? weak : undefined}>
        {home}
      </span>
    </span>
  );
}

// Stale pin as a mobile agate row — ruled + unboxed to match the register,
// with the Remove action kept so a ghost pin is never stuck on the list.
export function StaleAgateRow({ pin }: { pin: StalePin }) {
  const { unpinGame } = usePinned();
  return (
    <div
      className="flex items-center justify-between gap-3 py-[13px]"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px]" style={{ color: "var(--ink)", fontWeight: 600 }}>
          This game isn&apos;t in the live feed.
        </p>
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          We&apos;ll surface it again if it returns.
        </p>
      </div>
      <button
        type="button"
        onClick={() => unpinGame(pin.id)}
        aria-label="Remove this archived game"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        Remove
      </button>
    </div>
  );
}
