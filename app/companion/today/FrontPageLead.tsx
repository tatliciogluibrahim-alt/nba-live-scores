"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { accentFor, type TodayHeadline } from "./today-data";
import { Monument } from "../system/Monument";
import { rungFor, peakEligible } from "../system/register";
import { GameSpoilerScope, useFollowHidesGame, useReveal } from "../spoiler/reveal";
import { safeText } from "../spoiler/safe-text";
import { useNoSpoilers } from "../providers";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { heroKickoffStamp } from "./agate-slate";

// The lead settles in once per page-load, not on every Today re-mount (each
// tab return remounts the route). A module flag — reset on a full reload —
// gates the rise so it's a first-impression, not a restless replay.
let leadEntered = false;

// Front Page lead. Two render paths share the data plumbing
// (deriveTodayHeadline):
//
//   Game lead (all widths, System D) — the lead Monument: kicker (index 01 ·
//   live clock · context), stacked display-numeral scorerows, the calm deck
//   sentence, and the progress rail. Score-forward; the enriched lead.game
//   carries the real numerals + a parseable clock, and the whole monument
//   sits in a GameSpoilerScope so No-Spoilers users keep their protection
//   (scores + deck frost, one tap reveals the game). On desktop the mobile
//   bleed relaxes to the main column's left edge (D4b).
//
//   Headline-only leads (quiet / countdown days: no deck, no game) keep the
//   legacy editorial render (accent eyebrow, big state headline, optional
//   support) at all widths — no boxed deck card is drawn without a game.

const TONE_COLOR: Record<TodayHeadline["eyebrow"]["tone"], string> = {
  nba: "var(--nba)",
  wc: "var(--wc)",
  nfl: "var(--nfl)",
  mute: "var(--mute-1)",
};

// Size the headline to sit on ONE line at a standard phone width.
// Bricolage 700 runs ~0.55em average advance; we solve for the size that
// keeps the string within ~350px and clamp so short headlines ("All
// quiet.") stay bold without ballooning and the longest ("Three games
// tonight.") stays readable.
function headlineSize(len: number): number {
  // Confident, oversized lead (the one moment-line on the screen). Solve for
  // the size that keeps the string within ~380px and clamp so a short line
  // ("United States are live.") runs large without ballooning and the longest
  // ("Three matches tonight.") stays readable.
  const fit = Math.floor(380 / (Math.max(len, 1) * 0.55));
  return Math.max(30, Math.min(54, fit));
}

/** Parse "OKC vs SA" → ["OKC","SA"] when both sides are short codes that
 *  render cleanly as chips. Otherwise null (the matchup shows as text). */
function chipPair(matchup: string): [string, string] | null {
  const parts = matchup.split(/\s+vs\s+/i);
  if (parts.length === 2) {
    const [a, b] = parts.map((p) => p.trim());
    if (a && b && a.length <= 4 && b.length <= 4) return [a, b];
  }
  return null;
}

/** Split the deck detail into a time line and a context line. The deck
 *  detail arrives as "8:30 PM · Game 6" (or a live status with no " · ").
 *  The first segment is the time/status (top line); the broadcast and any
 *  remaining segments stack below as "NBC · GAME 6". */
function deckLines(
  detail: string,
  broadcast: string | undefined
): { top: string; bottom: string } {
  const parts = detail.split(" · ").map((p) => p.trim()).filter(Boolean);
  const top = parts[0] ?? "";
  const rest = parts.slice(1);
  const bottom = [broadcast, ...rest].filter(Boolean).join(" · ");
  return { top, bottom };
}

/** "50'" → "50′" for the kicker's live segment (the typographic minute
 *  mark the agate register uses). NBA clocks ("Q3 · 4:21") pass through. */
function primeMinutes(s: string): string {
  return s.replace(/'/g, "′");
}

/** Join short fragments into one deck line, closing each with a period
 *  ("Fourth quarter underway. OKC leads series 3-2."). */
function joinSentences(
  ...parts: Array<string | undefined>
): string | undefined {
  const done = parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`));
  return done.length ? done.join(" ") : undefined;
}

export function FrontPageLead({
  lead,
  flush = false,
}: {
  lead: TodayHeadline;
  /** Tightens the bottom margin when the Monument renders as the first
   *  entry of a folded UP NEXT section (the agate rows continue right
   *  below, so the full section gap would read as a break). */
  flush?: boolean;
}) {
  const game = lead.game ?? null;
  const deck = lead.deck;

  // No-Spoilers decision for the monument — the same baseHidden the game
  // detail pages compute (global toggle OR a hide-spoilers follow covering
  // a participant). GameSpoilerScope shares it with every Spoiler inside,
  // so one reveal tap un-hides scores + deck together. Hooks run
  // unconditionally (empty codes when there's no game).
  const participantCodes = game ? [game.awayCode, game.homeCode] : [];
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame(
    game?.source === "wc"
      ? { countryCodes: participantCodes, sport: "wc" }
      : { teamCodes: participantCodes, sport: game?.source ?? "nba" }
  );
  const baseHidden = globalNoSpoilers || followHidden;
  // Reveal-aware so the deck fact-string comes back the moment the user
  // taps to reveal the game (isRevealed clears the hidden decision). Called
  // unconditionally to keep hook order stable across the game/headline branches.
  const { isRevealed } = useReveal();

  // Animate only the first lead of the page-load; later re-mounts render static.
  const [animate] = useState(() => !leadEntered);
  useEffect(() => {
    leadEntered = true;
  }, []);
  const rise = animate ? "no-noise-lead-rise" : "";

  // ── Monument path (mobile) ──
  // deck implies game everywhere the data layer builds a lead; the guard
  // keeps a game-less deck (only constructible in tests) on the legacy path.
  if (game && deck) {
    const sport = game.source;
    const accent = accentFor(sport);
    // Elimination law (spec §1): WC peaks from the quarterfinals when
    // followed. Today's lead is the user's cared-about pick (pickHero
    // prefers pinned/followed games), so followed=true here; D2 threads
    // the real per-game flag. NBA Game 7 / clinch flags aren't on the
    // lead payload yet.
    const peak =
      sport === "wc" && game.stage
        ? peakEligible({ sport: "wc", stage: game.stage, followed: true })
        : sport === "nfl"
          // nflLeadGame sets `stage` only for postseason rounds, so a
          // preseason or regular-season game can never claim the peak field.
          ? peakEligible({ sport: "nfl", isPlayoff: Boolean(game.stage) })
          : false; // D2: thread NBA gameContext flags for the elimination law
    const rung = rungFor({ status: game.status, peak });
    const progress = computeLiveActivityProgress(
      sport,
      game.statusLine,
      game.status
    );

    // Kicker context: live leads show stage/round · channel (the accent
    // segment already carries the clock); upcoming leads carry a day-aware
    // kickoff ("TODAY 4:00 PM" / "MON 3:00 PM") followed by the detail's
    // context tail, so day + time + round + channel read as ONE cluster
    // (beta feedback 2026-07-05). The Monument uppercases the whole row.
    let contextHead: string | undefined;
    if (lead.live) {
      contextHead = game.contextLabel;
    } else if (deck.imminent) {
      // Started, feed not live yet — say so instead of a passed time.
      const tail = deck.detail
        .split(" · ")
        .slice(1)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" · ");
      contextHead = ["Starting", tail].filter(Boolean).join(" · ");
    } else if (deck.dateIso) {
      const tail = deck.detail
        .split(" · ")
        .slice(1)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" · ");
      contextHead = [heroKickoffStamp(deck.dateIso, new Date()), tail]
        .filter(Boolean)
        .join(" · ");
    } else {
      contextHead = deck.detail;
    }
    const context = [contextHead, deck.broadcast].filter(Boolean).join(" · ");

    // Deck line: live = the calm status sentence plus the stake/context
    // support; upcoming = the stake alone ("Winner goes through to the
    // quarterfinals." / "OKC leads series 3-2."). The old count headline
    // ("Two matches today.") duplicated the UP NEXT section count, and the
    // day now lives in the kicker — so with no stake the deck stays empty
    // rather than restating what the Monument already shows.
    const deckText = lead.live
      ? joinSentences(deck.detail, lead.support)
      : joinSentences(lead.support);

    // No-Spoilers deck suppression (spec §9). The Monument already frosts
    // the deck visually via its <Spoiler>, but the SAFE-TEXT rule means the
    // underlying (blurred) string + its a11y text must ALSO be non-spoilery
    // so nothing leaks before the tap. When the game is hidden, run the deck
    // through safeText — a spoilery support line ("OKC leads series 3-2.")
    // blanks the whole deck (whole-line redaction, same as the pinned-card
    // detail line); a calm status deck ("Second half underway.") passes
    // through and is just frosted. isRevealed clears baseHidden, so the full
    // deck returns on reveal. Non-hidden games are untouched.
    const deckHidden = baseHidden && !isRevealed(game.gameId);
    const safeDeck = deckText
      ? safeText(deckText, deckHidden) || undefined
      : undefined;

    return (
      // System D lead Monument at every width (D4b): the mobile bleed
      // (-mx-4 to the screen gutter) relaxes to mx-0 in the desktop main
      // column, where the Monument sits at the column's left edge with its
      // own 18px inset. The legacy md-only Front Page card render is gone —
      // D4b ends the desktop-frozen law for Today.
      <div className={`${rise} -mx-4 md:mx-0 ${flush ? "mb-1" : "mb-5"}`}>
        <GameSpoilerScope gameId={game.gameId} hidden={baseHidden}>
          <Monument
            sport={sport}
            rung={rung}
            status={game.status}
            awayName={game.awayName}
            homeName={game.homeName}
            awayScore={game.awayScore}
            homeScore={game.homeScore}
            progress={progress}
            kicker={
              <>
                <span
                  style={{
                    // C4 (§5 v3): the lead index is brand chrome on cream.
                    // On the peak accent field it stays full cream (vermilion
                    // is a cream-ground color; contrast law wins on the field).
                    color:
                      rung === "peak"
                        ? "var(--cream-on-acc)"
                        : "var(--brand)",
                    fontWeight: 700,
                  }}
                >01</span>
                {lead.live ? (
                  <span
                    aria-hidden
                    className="no-noise-live-fade inline-block h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{
                      background:
                        rung === "peak" ? "var(--cream-on-acc)" : accent,
                    }}
                  />
                ) : null}
                {lead.live ? (
                  // shrink-0 + nowrap: NFL's "Q3 10:24" clock wrapped
                  // mid-segment beside a long tail (live 2026-08-29).
                  // The clock holds; the truncating context gives.
                  <span
                    className="shrink-0 whitespace-nowrap"
                    style={
                      // On the peak field the kicker is already full
                      // cream (contrast law) — no accent-on-accent.
                      rung === "peak"
                        ? undefined
                        : { color: accent, fontWeight: 700 }
                    }
                  >
                    Live · {primeMinutes(game.statusLine)}
                  </span>
                ) : null}
                {context ? (
                  <span className="min-w-0 truncate">· {context}</span>
                ) : null}
              </>
            }
            deck={safeDeck}
            href={deck.href}
            gameId={game.gameId}
            spoilerSubject={game.spoilerSubject}
          />
        </GameSpoilerScope>
      </div>
    );
  }

  // Headline-only lead (quiet / countdown days) — legacy at all widths.
  return <LegacyLead lead={lead} rise={rise} />;
}

// ── Legacy render (Concept A "Front Page") ───────────────────────────
// The pre-System-D editorial lead: accent eyebrow, big punchy state
// headline, condensed deck card (chips · AT · chips — time / broadcast),
// optional stake line. Now only reached for headline-only states (quiet /
// countdown days) where there's no game behind the lead, so the deck-card
// branch never draws — it renders as a clean eyebrow + display headline +
// support at every width.

function LegacyLead({ lead, rise }: { lead: TodayHeadline; rise: string }) {
  const eyebrowColor = TONE_COLOR[lead.eyebrow.tone];
  const size = headlineSize(lead.headline.length);
  const deck = lead.deck;
  const chips = deck ? chipPair(deck.matchup) : null;
  const chipBg =
    deck?.accent === "var(--wc)"
      ? "var(--wc-soft)"
      : deck?.accent === "var(--nfl)"
        ? "var(--nfl-soft)"
        : "var(--nba-soft)";
  const lines = deck ? deckLines(deck.detail, deck.broadcast) : null;

  return (
    <section className="mb-5">
      <p
        className={`${rise} mb-2 flex items-center gap-1.5 text-[12.5px] uppercase`}
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: eyebrowColor,
        }}
      >
        {lead.live ? (
          <span
            aria-hidden
            className="no-noise-live-fade inline-block h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: eyebrowColor }}
          />
        ) : null}
        {lead.eyebrow.label}
      </p>

      {/* "Meet in the middle" weight: our display face (Bricolage) at
          700, not the handoff mockup's heavier Archivo Black 900. Reads
          editorial-bold without shouting. */}
      <h2
        className={rise}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textWrap: "pretty",
          animationDelay: "60ms",
        }}
      >
        {lead.headline}
      </h2>

      {deck ? (
        <Link
          href={deck.href}
          aria-label={`Open ${deck.matchup}`}
          className={`${rise} mt-5 flex items-center gap-3 rounded-[14px] border px-4 py-3.5 transition active:scale-[0.99]`}
          style={{
            background: lead.live ? "var(--paper)" : "var(--cream-2)",
            borderColor: lead.live ? deck.accent : "var(--line)",
            borderLeft: `3px solid ${deck.accent}`,
            animationDelay: "120ms",
          }}
        >
          {chips ? (
            <div className="flex items-center gap-2">
              <DeckChip label={chips[0]} bg={chipBg} fg={deck.accent} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: "var(--mute-1)",
                }}
              >
                {/* "AT" is an NBA away-@-home convention. Soccer (and the
                    Summer Soccer's neutral venues) reads "vs" — and the list
                    rows below use "vs" too, so this keeps one screen
                    consistent with itself. */}
                {deck.accent === "var(--wc)" ? "VS" : "AT"}
              </span>
              <DeckChip label={chips[1]} bg={chipBg} fg={deck.accent} />
            </div>
          ) : (
            <span
              className="truncate text-[15px]"
              style={{ color: "var(--ink)", fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              {deck.matchup}
            </span>
          )}

          <div className="flex-1" />

          {lead.live ? (
            // Live games: a single clean line, not a full sentence
            // ("Game is live.") jammed into the status slot and stacked
            // over the channel. The eyebrow ("LIVE NOW" + pulse) already
            // carries the live state; here we just point to where to
            // watch. "LIVE · ABC" reads as deliberate, not amateur.
            <div
              className="text-right uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: deck.accent,
              }}
            >
              {deck.broadcast ? `LIVE · ${deck.broadcast}` : "LIVE"}
            </div>
          ) : lines && (lines.top || lines.bottom) ? (
            <div className="text-right">
              {lines.top ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {lines.top}
                </div>
              ) : null}
              {lines.bottom ? (
                <div
                  className="mt-0.5 uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--mute-1)",
                  }}
                >
                  {lines.bottom}
                </div>
              ) : null}
            </div>
          ) : null}
        </Link>
      ) : null}

      {lead.support ? (
        <p
          className={`${rise} mt-3.5 text-[14px] leading-snug`}
          style={{ color: "var(--ink-2)", fontWeight: 400, animationDelay: "170ms" }}
        >
          {lead.support}
        </p>
      ) : null}
    </section>
  );
}

function DeckChip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px]"
      style={{
        background: bg,
        color: fg,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}
