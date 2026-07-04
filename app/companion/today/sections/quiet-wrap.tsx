"use client";

import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";
import { NoSpoilerGameCard } from "../../spoiler/NoSpoilerGameCard";
import { useNoSpoilers } from "../../providers";
import { Spoiler } from "../../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useEffectiveNoSpoilers,
  useFollowHidesGame,
} from "../../spoiler/reveal";
import { SecHead } from "../../system/SecHead";
import { AgateRow } from "../../system/AgateRow";
import { Stamp } from "../../system/Stamp";
import { winnerSide } from "../../system/emphasis";
import { SectionHeader } from "./section-header";
import {
  agateScore,
  matchupCodes,
  padIdx,
  parseScoreLine,
  wrapCountLabel,
} from "../agate-slate";
import type { QuietWrapItem } from "../today-data";

// One-line-each finals from the last 3 days. Phase 8b extended the
// window from "today + yesterday" to a rolling 3-day surface so a
// series that wrapped 2 nights ago is still browsable from Today
// rather than vanishing the moment ESPN drops it from the
// current-week feed. The eyebrow auto-formats per day ("Earlier",
// "Yesterday", "Sat", "Fri") so the list reads as a calm timeline.
//
// When No-Spoilers is on, each row swaps to a NoSpoilerGameCard with
// context-aware reveal copy.
//
// Note: the share-as-image affordance was removed in an earlier
// polish pass — the calm companion direction shouldn't lean on
// social/share CTAs. The QuietWrapShareModal component is left
// dormant in app/companion/share/ so it can be revived later without
// rebuilding from scratch.

export function QuietWrap({
  items,
  startIndex = 1,
}: {
  items: QuietWrapItem[];
  /** First running index for the mobile agate rows (continues the slate). */
  startIndex?: number;
}) {
  if (items.length === 0) return null;

  return (
    <>
      {/* Mobile: System D agate slate on blush plate. Full-bleed: -mx-4 bleeds
          to screen edges against the page's px-4 container; inner px-4 realigns
          content. Padding matches c4 mock (.sec = 18px 18px 6px). */}
      <section
        className="md:hidden -mx-4"
        style={{ background: "var(--plate-wrap)" }}
      >
        <div className="px-4 pt-[18px] pb-[6px]">
          <SecHead name="Quiet wrap" count={wrapCountLabel(items.length)} />
          {items.map((item, i) => (
            <QuietWrapAgateRow
              key={item.id}
              item={item}
              idx={padIdx(startIndex + i)}
            />
          ))}
        </div>
      </section>

      {/* Desktop: legacy card list, unchanged */}
      <div className="hidden md:block">
        <QuietWrapCards items={items} />
      </div>
    </>
  );
}

// One wrapped game as an agate row. The No-Spoilers seam mirrors AlsoLiveBand
// exactly: global toggle OR a per-follow hide computes `hidden`, wraps the row
// in a GameSpoilerScope, and the score renders inside a <Spoiler> (one tap
// reveals just this game, session-scoped). Winner emphasis lives in the inner
// component so it can read the reveal-aware effective state — see the comment
// there for why emphasis is itself a spoiler.
function QuietWrapAgateRow({ item, idx }: { item: QuietWrapItem; idx: string }) {
  const { away, home } = matchupCodes(item.matchup);
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame(
    item.source === "wc"
      ? { countryCodes: [away, home] }
      : { teamCodes: [away, home] }
  );
  const hidden = globalNoSpoilers || followHidden;

  return (
    <GameSpoilerScope gameId={item.id} hidden={hidden}>
      <QuietWrapAgateInner item={item} idx={idx} away={away} home={home} />
    </GameSpoilerScope>
  );
}

function QuietWrapAgateInner({
  item,
  idx,
  away,
  home,
}: {
  item: QuietWrapItem;
  idx: string;
  away: string;
  home: string;
}) {
  const { away: awayScore, home: homeScore } = parseScoreLine(item.scoreLine);

  // Winner emphasis (ink winner / muted loser) IS a spoiler — it silently
  // reveals who won. Gate it on the reveal-aware effective state, not the raw
  // toggle: useEffectiveNoSpoilers reads this row's GameSpoilerScope AND any
  // session reveal, so when the user taps to reveal the frosted score the
  // loser un-mutes at the same instant. While hidden we bake NO emphasis into
  // `main` (both codes equal weight), leaving the frosted score as the only
  // spoiler-gated surface.
  const hiddenNow = useEffectiveNoSpoilers(item.id);
  const winner = hiddenNow ? null : winnerSide(awayScore, homeScore, "final");

  return (
    <AgateRow
      idx={idx}
      main={<WrapMatchup away={away} home={home} winner={winner} />}
      score={
        <Spoiler gameId={item.id} ariaSubject={item.spoilerSubject}>
          {agateScore(awayScore, homeScore)}
        </Spoiler>
      }
      stamp={<Stamp text="FT" variant="faint" />}
      href={item.href}
    />
  );
}

// Matchup with winner emphasis baked in by the caller (the AgateRow contract):
// winner code 800/full-ink, loser muted, a draw (winner null) leaves both at
// the row's base weight. Mirrors the gallery's Matchup sample + d-mix.
function WrapMatchup({
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

function QuietWrapCards({ items }: { items: QuietWrapItem[] }) {
  const noSpoilers = useNoSpoilers();

  return (
    <section>
      <SectionHeader label="Quiet wrap" />
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {noSpoilers ? (
              <NoSpoilerGameCard
                kind={item.kind}
                matchup={item.matchup}
                ariaSubject={item.spoilerSubject}
              >
                <QuietRowRevealed item={item} />
              </NoSpoilerGameCard>
            ) : (
              <QuietRowRevealed item={item} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuietRowRevealed({ item }: { item: QuietWrapItem }) {
  // Quiet Wrap = yesterday's finals = *reference*, not action. We
  // deliberately strip the sport accent rail (which Up Next uses for
  // active games) and mute the matchup heading + score line so these
  // rows read calmly under Up Next without competing for attention.
  return (
    <Link
      href={item.href}
      aria-label={`${item.matchup} final, ${item.scoreLine}`}
      className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{item.eyebrow}</Eyebrow>
          <p
            className="mt-1 truncate text-[14px] leading-snug"
            style={{
              color: "var(--mute-1)",
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            {item.matchup}
          </p>
        </div>
        <span
          className="tabular-nums shrink-0 text-[14px]"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.scoreLine}
        </span>
      </div>
      {item.context ? (
        <p
          className="mt-1 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {item.context}
        </p>
      ) : null}
    </Link>
  );
}
