"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Spoiler } from "../spoiler/Spoiler";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";
import { winnerSide } from "./emphasis";
import { Rail } from "./Rail";
import type { RegisterRung } from "./register";

// System D monument — the lead. One game rendered as broadsheet type: a
// stacked away/home scorerow in display numerals, a deck line, the optional
// agate stat line, and the progress Rail. Two colorways by rung:
//
//   rest / live → ink-on-cream (d-mix `.lead` / d-docking tightened gap).
//   peak        → the accent field (d-nba `.peaklead`): field bg = the sport
//                 accent, ALL text full cream. No dim text on the field
//                 (spec §3 contrast law) except the Rail's end labels.
//
// Numerals: 100px / wght 800 / lh .88 / ls -.04em (d-mix), dropping to 84px
// when either score reaches three digits so a 128–124 pair fits at 390px.
// Second scorerow tucks up 6px (d-docking UX-M8) so the pair reads as one
// unit.
//
// Emphasis: at final, winnerSide (spec §2) inks the winner and mutes the
// loser; live shows the Game Pulse leader (ink = ahead / mute = behind). On
// the peak field neither dims — the contrast law wins over the pulse.
//
// No-Spoilers is inherited, not reinvented: each score numeral is wrapped in
// the same <Spoiler> primitive ScoreModule uses (shared `gameId` reveal,
// `spoilerSubject` aria). deck and agateLine are wrapped the same way when
// a gameId is present, so one reveal tap un-hides scores + narrative together.
// A caller that knows the participants wraps the Monument in a
// GameSpoilerScope; the Spoilers read that decision.
//
// Navigation contract: navigation lives on the kicker row; the body hosts
// interactive reveal targets. Spoiler reveal buttons must never nest inside
// an anchor, which is why only the kicker row becomes a <Link>.

export function Monument({
  awayName,
  homeName,
  awayScore,
  homeScore,
  kicker,
  deck,
  agateLine,
  progress,
  sport,
  rung,
  status,
  href,
  gameId,
  spoilerSubject,
}: {
  awayName: string;
  homeName: string;
  awayScore: number | null;
  homeScore: number | null;
  kicker: ReactNode;
  deck?: string;
  agateLine?: string;
  progress: number;
  sport: "nba" | "wc" | "nfl";
  rung: RegisterRung;
  status: "live" | "upcoming" | "final";
  href?: string;
  gameId?: string;
  spoilerSubject?: string;
}) {
  const isPeak = rung === "peak";
  const accent =
    sport === "nba" ? "var(--nba)" : sport === "wc" ? "var(--wc)" : "var(--nfl)";

  const hasScores = typeof awayScore === "number" && typeof homeScore === "number";

  // No-Spoilers gate for winner/leader emphasis. Emphasis (ink winner, mute
  // loser) IS itself a spoiler — the tone difference silently reveals who won.
  // Gate it on the reveal-aware effective state so the moment the user taps to
  // reveal, the muted loser un-mutes at the same instant. When hidden we render
  // BOTH scores at equal base ink — no differentiation until revealed.
  // Hook called unconditionally (React rules); empty-string fallback matches
  // the quiet-wrap precedent for hooks with an optional gameId.
  // See: app/companion/today/sections/quiet-wrap.tsx QuietWrapAgateInner.
  const hiddenNow = useEffectiveNoSpoilers(gameId ?? "");

  // Final winner (spec §2). Live uses the leader pulse instead.
  const win = winnerSide(awayScore, homeScore, status);
  const awayLeads = hasScores && (awayScore as number) > (homeScore as number);
  const homeLeads = hasScores && (homeScore as number) > (awayScore as number);
  // Full-ink unless the *other* side is ahead (final: unless it won). A level
  // score leaves both full — the draw law.
  const awayFull = status === "final" ? win !== "home" : !homeLeads;
  const homeFull = status === "final" ? win !== "away" : !awayLeads;

  // Contrast law: the peak field never dims a score. On cream, the trailing
  // side mutes back. When hidden by No-Spoilers both scores render at equal
  // base ink — no leader/winner differentiation until revealed.
  const fullColor = isPeak ? "var(--cream-on-acc)" : "var(--ink)";
  const muteColor = "var(--mute-1)";
  const awayColor = isPeak || hiddenNow ? fullColor : awayFull ? fullColor : muteColor;
  const homeColor = isPeak || hiddenNow ? fullColor : homeFull ? fullColor : muteColor;

  // Three-digit scores (128–124) drop the numeral a notch so the pair fits
  // the 390px column.
  const threeDigit =
    (awayScore != null && String(awayScore).length >= 3) ||
    (homeScore != null && String(homeScore).length >= 3);
  const scoreFontSize = threeDigit ? 84 : 100;

  const teamColor = isPeak ? "var(--cream-on-acc)" : "var(--ink)";
  const deckColor = isPeak ? "var(--cream-on-acc)" : "var(--mute-1)";
  const kickerColor = isPeak ? "var(--cream-on-acc)" : "var(--mute-1)";
  const arrowColor = isPeak ? "var(--cream-on-acc)" : "var(--mute-2)";

  const outerStyle = isPeak
    ? { background: accent, color: "var(--cream-on-acc)", padding: "24px 18px 22px" }
    : { padding: "22px 18px 0" };

  // Shared kicker row style — applied to both the <p> (no href) and the
  // <Link> (href present) so they look identical.
  const kickerStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: isPeak ? 700 : 600,
    letterSpacing: "0.14em",
    color: kickerColor,
  } as const;
  const kickerClass = "mb-4 flex items-center gap-2 uppercase";

  return (
    <section style={outerStyle}>
      {/* Kicker line — the caller composes the content (index, live text,
          channel, any StakesStamp) as flex children; the Monument owns the
          type + the trailing tap affordance.
          Navigation lives on the kicker row; the body hosts interactive
          reveal targets (Spoiler buttons must never nest in an anchor). */}
      {href ? (
        <Link href={href} className={kickerClass} style={kickerStyle}>
          {kicker}
          <span aria-hidden style={{ marginLeft: "auto", color: arrowColor }}>
            →
          </span>
        </Link>
      ) : (
        <p className={kickerClass} style={kickerStyle}>
          {kicker}
        </p>
      )}

      <ScoreRow
        first
        name={awayName}
        score={awayScore}
        color={awayColor}
        teamColor={teamColor}
        fontSize={scoreFontSize}
        gameId={gameId}
        spoilerSubject={spoilerSubject}
      />
      <ScoreRow
        name={homeName}
        score={homeScore}
        color={homeColor}
        teamColor={teamColor}
        fontSize={scoreFontSize}
        gameId={gameId}
        spoilerSubject={spoilerSubject}
      />

      {deck && (
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: isPeak ? 600 : 500,
            color: deckColor,
          }}
        >
          {gameId ? (
            <Spoiler ariaSubject={spoilerSubject} gameId={gameId}>
              {deck}
            </Spoiler>
          ) : (
            deck
          )}
        </p>
      )}

      {agateLine && (
        <p
          className="tabular-nums lining-nums"
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: deckColor,
          }}
        >
          {gameId ? (
            <Spoiler ariaSubject={spoilerSubject} gameId={gameId}>
              {agateLine}
            </Spoiler>
          ) : (
            agateLine
          )}
        </p>
      )}

      {(status === "live" || status === "final") && (
        <div style={{ marginTop: 18 }}>
          <Rail progress={progress} sport={sport} rung={rung} />
        </div>
      )}
    </section>
  );
}

function ScoreRow({
  first,
  name,
  score,
  color,
  teamColor,
  fontSize,
  gameId,
  spoilerSubject,
}: {
  first?: boolean;
  name: string;
  score: number | null;
  color: string;
  teamColor: string;
  fontSize: number;
  gameId?: string;
  spoilerSubject?: string;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ marginTop: first ? 0 : -6 }}
    >
      <span
        className="min-w-0 flex-1 truncate pr-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 23,
          fontWeight: 700,
          letterSpacing: 0,
          color: teamColor,
        }}
      >
        {name}
      </span>
      {score != null && (
        <span
          className="flex-none tabular-nums lining-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontVariantNumeric: "tabular-nums lining-nums",
            fontSize,
            fontWeight: 800,
            lineHeight: 0.88,
            letterSpacing: "-0.04em",
            color,
          }}
        >
          <Spoiler ariaSubject={spoilerSubject} gameId={gameId}>
            {score}
          </Spoiler>
        </span>
      )}
    </div>
  );
}

// Peak-only stakes stamp (e.g. GAME 7). The one badge that inverts against
// the accent field: ink fill, cream text. Kept local to the Monument instead
// of a new Stamp variant because it exists solely as peak chrome (d-nba
// `.g7`). Callers drop it inside the `kicker` node.
export function StakesStamp({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block whitespace-nowrap uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.14em",
        padding: "4px 8px",
        background: "var(--ink)",
        color: "var(--cream)",
      }}
    >
      {children}
    </span>
  );
}
