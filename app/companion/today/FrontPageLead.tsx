"use client";

import Link from "next/link";
import type { TodayHeadline } from "./today-data";

// Front Page lead (Concept A). The editorial top of Today: an accent
// eyebrow, a big punchy state headline ("One game up next."), and a
// single condensed "deck" card for the lead game (chips · AT · chips —
// time / broadcast), with an optional stake line beneath.
//
// The deck carries no score, so it's No-Spoilers-safe by construction.
// The headline copy is real state-driven copy (deriveTodayHeadline),
// not the old conversational brief sentence blown up large.

const TONE_COLOR: Record<TodayHeadline["eyebrow"]["tone"], string> = {
  nba: "var(--nba)",
  wc: "var(--wc)",
  mute: "var(--mute-1)",
};

// Size the headline to sit on ONE line at a standard phone width.
// Bricolage 700 runs ~0.55em average advance; we solve for the size that
// keeps the string within ~350px and clamp so short headlines ("All
// quiet.") stay bold without ballooning and the longest ("Three games
// tonight.") stays readable.
function headlineSize(len: number): number {
  const fit = Math.floor(350 / (Math.max(len, 1) * 0.55));
  return Math.max(28, Math.min(46, fit));
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

export function FrontPageLead({ lead }: { lead: TodayHeadline }) {
  const eyebrowColor = TONE_COLOR[lead.eyebrow.tone];
  const size = headlineSize(lead.headline.length);
  const deck = lead.deck;
  const chips = deck ? chipPair(deck.matchup) : null;
  const chipBg = deck?.accent === "var(--wc)" ? "var(--wc-soft)" : "var(--nba-soft)";
  const lines = deck ? deckLines(deck.detail, deck.broadcast) : null;

  return (
    <section className="mb-5">
      <p
        className="mb-2 flex items-center gap-1.5 text-[12.5px] uppercase"
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
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.0,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textWrap: "pretty",
        }}
      >
        {lead.headline}
      </h2>

      {deck ? (
        <Link
          href={deck.href}
          aria-label={`Open ${deck.matchup}`}
          className="mt-5 flex items-center gap-3 rounded-[14px] border px-4 py-3.5 transition active:scale-[0.99]"
          style={{
            background: lead.live ? "var(--paper)" : "var(--cream-2)",
            borderColor: lead.live ? deck.accent : "var(--line)",
            borderLeft: `3px solid ${deck.accent}`,
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
          className="mt-3.5 text-[14px] leading-snug"
          style={{ color: "var(--ink-2)", fontWeight: 400 }}
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
