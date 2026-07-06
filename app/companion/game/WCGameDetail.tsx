"use client";

import { useState } from "react";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { safeText } from "../spoiler/safe-text";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { useFollows, useNoSpoilers } from "../providers";
import type { WCGameLite, WCMatchEventLite } from "../today/today-data";
import type { LiveActivityStartInput } from "../native/live-activity";
import { deriveSubline } from "../native/live-activity-subline";
import { Monument } from "../system/Monument";
import { InkField } from "../system/InkField";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { rungFor, peakEligible } from "../system/register";
import { TrackControl } from "./TrackControl";
import { WCShareModal } from "../share/WCShareModal";
import { StartingXI, LineupsAreInRow } from "./StartingXI";
import { useWCLineups } from "./use-wc-lineups";
import { roundKeyFromStage } from "../tournament/knockout-data";

// Summer Soccer game detail.
//
// Mobile (System D, D2 Task 3) recomposes the moment per
// docs/superpowers/design-directions/d-game.html: the crumb bar lives at the
// page level (DetailCrumbs); here the mobile column is Monument → MATCH EVENTS
// ink field → GROUP agate → WATCH agate → TrackControl → share. Desktop (md+)
// keeps the legacy H1 + ScoreModule + HeroMoment + rail layout pixel-identical
// until D4 (mirrors the D1 seam: mobile blocks `md:hidden`, the desktop grid
// `hidden md:grid`). Every legacy feature — RevealResultsButton, HeroMoment,
// highlights, WatchLine, share modal — stays mounted.
//
// Optional `highlights` prop lets the preview route inject mock content since
// the WC live feed doesn't expose top-scorer / shot leaders the way the NBA
// endpoint does.

// Sport accent hex — mirrors ACCENT_WC in LiveActivitySync.tsx (the two must
// stay in lockstep so the on-tap dock and the poll backstop agree).
const WC_ACCENT_HEX = "#1e6b3c";

export type WCHighlight = {
  eyebrow: string;
  body: string;
  spoilery?: boolean;
};

export function WCGameDetail({
  game,
  pinned,
  onPin,
  onUnpin,
  pinnedLiveIds = [],
}: {
  game: WCGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  /** Ordered pinned-and-live game ids for TrackControl's slot meter. */
  pinnedLiveIds?: string[];
}) {
  // Hidden when the global toggle is on OR a hide-spoilers country/series
  // follow covers this match (selective), minus a session reveal. The
  // GameSpoilerScope below shares the decision with every child.
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [game.away.abbreviation, game.home.abbreviation],
  });
  const baseHidden = globalNoSpoilers || followHidden;
  const { isRevealed, reveal } = useReveal();
  const noSpoilers = baseHidden && !isRevealed(game.id);
  const [shareOpen, setShareOpen] = useState(false);
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";

  // Starting XI (§17) — the programme lineups. Fetched from ESPN's summary
  // endpoint; renders nothing until it lands (or on hard failure, e.g. preview
  // ids). `announced` gates the pre-match "Lineups are in" deck disclosure.
  const lineups = useWCLineups(game.id, status, game.date);
  const lineupsAnnounced = lineups != null && "teams" in lineups;

  // Soccer status labels. "HT" (halftime), "FT" (full time), "90'+3"
  // style strings come from the feed; we surface them verbatim when
  // present, fall back to generic tier labels otherwise.

  // HeroMoment content for WC.
  const hero = deriveWCHero(game);

  // Soccer-bespoke context line. An imminent match (scheduled time passed,
  // feed not live yet) says "Starting" — never a time that already went by
  // (audit 2026-07-06 #7).
  const contextLine = isUpcoming
    ? hero.imminent
      ? "Starting"
      : new Date(game.date).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
    : isLive
      ? game.statusText
      : "Full time";

  const channel = game.broadcasts[0] ?? game.watchLabel ?? null;
  const matchEvents = relevantMatchEvents(game.events ?? []);

  // Live-Activity progress rail value — shared by the Monument (mobile) and
  // the ScoreModule (desktop) so both read the same point in the match.
  const progress = computeLiveActivityProgress("wc", game.statusText, status);

  // ── System D mobile derivations ─────────────────────────────────────────
  // Elimination law (spec §1): WC peaks from the quarterfinals when the viewer
  // follows a country in the match (the Final peaks for everyone). Group-stage
  // games never peak, so the default seed stays rung-2 (live, cream field).
  const { follows } = useFollows();
  const followed = follows.some(
    (f) =>
      f.kind === "country" &&
      (f.id === game.away.abbreviation || f.id === game.home.abbreviation)
  );
  const peak = peakEligible({ sport: "wc", stage: game.stage, followed });
  const rung = rungFor({ status, peak });
  const isPeak = rung === "peak";

  // Monument kicker — the accent "Live · 50′" segment plus a muted context
  // tail (stage · broadcaster; upcoming also shows the kickoff time). No index
  // on the detail (the monument IS the page, not a slate row).
  const stageLabel = game.group
    ? `Group ${game.group}`
    : game.stage || "Summer Soccer";
  const liveClock = isLive ? game.statusText.replace(/'/g, "′") : "";
  const tail = (
    isLive
      ? [stageLabel, channel]
      : isUpcoming
        ? [contextLine, stageLabel, channel]
        : [stageLabel, channel]
  )
    .filter(Boolean)
    .join(" · ");
  const monumentKicker = (
    <>
      {isLive ? (
        <span
          aria-hidden
          className="no-noise-live-fade inline-block shrink-0 rounded-full"
          style={{
            width: 6,
            height: 6,
            background: isPeak ? "var(--cream-on-acc)" : "var(--wc)",
          }}
        />
      ) : null}
      {isLive ? (
        <span style={isPeak ? undefined : { color: "var(--wc)", fontWeight: 700 }}>
          Live · {liveClock}
        </span>
      ) : null}
      {tail ? (
        <span className="min-w-0 truncate">{isLive ? `· ${tail}` : tail}</span>
      ) : null}
    </>
  );

  // Monument deck — the calm hero sentence, run through safeText so a spoilery
  // line blanks before the frost (mirrors FrontPageLead). Score numerals +
  // deck are Spoiler-wrapped by the Monument itself, so one tap reveals both.
  // Pre-kickoff the deck stays empty: the kicker already carries day, time,
  // round, and channel, so "Kicks off today." restated the line above it
  // (beta feedback 2026-07-05). The imminent state now lives in the kicker
  // ("STARTING"), so its deck sentence is redundant too.
  const showDeck = !isUpcoming;
  const safeDeck =
    showDeck && hero.headline
      ? safeText(hero.headline, noSpoilers) || undefined
      : undefined;

  // MATCH EVENTS ink field — the goal/red story (yellows stay off the pulse,
  // matching d-game). Under No-Spoilers the field collapses to one reveal row
  // so its very presence never leaks that goals happened.
  // Newest-first — the live pulse leads with the most recent goal (d-game).
  // The desktop rail keeps chronological feed order (untouched).
  const inkEvents = matchEvents
    .filter((e) => e.type !== "yellow_card")
    .slice()
    .sort((a, b) => minuteValue(b.minute) - minuteValue(a.minute));
  const showInkField = !isUpcoming && (noSpoilers || inkEvents.length > 0);

  // Live-Activity start payload for the on-tap dock (native + live). Built here
  // because this component already holds the No-Spoilers decision (redaction);
  // the LiveActivitySync poll is the backstop. Null off-live.
  const startInput: LiveActivityStartInput | null = isLive
    ? {
        gameId: game.id,
        matchup: `${game.away.abbreviation} vs ${game.home.abbreviation}`,
        stage: game.stage ? `Summer Soccer · ${game.stage}` : "Summer Soccer",
        sport: "wc",
        awayCode: game.away.abbreviation,
        awayScore: game.away.score,
        homeCode: game.home.abbreviation,
        homeScore: game.home.score,
        statusLine: game.statusText || "",
        subline: deriveSubline(
          game.stage ? `Summer Soccer · ${game.stage}` : "Summer Soccer"
        ),
        accentHex: WC_ACCENT_HEX,
        progress,
        redacted: baseHidden,
      }
    : null;

  // Reference material (match events + highlights). On desktop (md+) these
  // move to a sticky right rail so the main column stays focused on the moment
  // (scoreboard, hero, watch, pin). Mobile uses the System D ink field above,
  // so these render only inside the desktop grid.


  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-4xl md:pt-2">
     <GameSpoilerScope gameId={game.id} hidden={baseHidden}>
      {/* One stable h1 for SEO / a11y across breakpoints. The mobile Monument
          renders the matchup as display type; the desktop visual is
          aria-hidden so the heading isn't read twice. */}
      <h1 className="sr-only">
        {game.away.name} vs {game.home.name}
      </h1>

      {/* ══════════ System D composition — all widths (D4b: seam deleted) ══════════ */}
      <div className="-mx-4">
        <Monument
          sport="wc"
          rung={rung}
          status={status}
          awayName={game.away.name}
          homeName={game.home.name}
          awayScore={isUpcoming ? null : game.away.score}
          homeScore={isUpcoming ? null : game.home.score}
          progress={progress}
          kicker={monumentKicker}
          deck={safeDeck}
          gameId={game.id}
          spoilerSubject={subject}
        />

        {/* Lineups-are-in — the §17 quiet deck disclosure. Only pre-match, and
            only once the XI is announced; scrolls down to the Starting XI. */}
        {isUpcoming && lineupsAnnounced ? (
          <div className="px-[18px] pt-4">
            <LineupsAreInRow />
          </div>
        ) : null}

        {/* MATCH EVENTS — the ink register (§9 collapse under No-Spoilers) */}
        {showInkField ? (
          <div className="mt-[26px]">
            <InkField label="Match events" live={isLive}>
              {noSpoilers ? (
                <button
                  type="button"
                  onClick={() => reveal(game.id)}
                  aria-label={`Reveal ${subject} match events, hidden by No-Spoilers mode`}
                  className="flex w-full items-center gap-2 text-left"
                  style={{
                    padding: "13px 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--cream-on-ink)" }}>Hidden</span>
                  <span
                    style={{ color: "var(--cream-on-ink-dim)", fontWeight: 500 }}
                  >
                    · tap to reveal
                  </span>
                </button>
              ) : (
                inkEvents.map((event, index) => (
                  <InkEventRow
                    key={`${event.minute}-${event.type}-${event.playerName}-${index}`}
                    event={event}
                    game={game}
                  />
                ))
              )}
            </InkField>
          </div>
        ) : null}

        {/* STARTING XI (§17) — the programme lineups. Below the events field
            (or below the monument when upcoming/no events). Not a spoiler;
            renders nothing until the feed lands. */}
        <StartingXI lineups={lineups} status={status} />

        {/* GROUP — agate section, two chevroned rows into each country page.
            Knockout matches add the bracket row: from a Round of 16 page the
            bracket is the "who's next" answer, and Today's front door
            shouldn't be the only way in (beta feedback 2026-07-05). */}
        <section className="px-[18px] pt-6">
          <SecHead name={game.group ? `Group ${game.group}` : "Summer Soccer"} />
          {[game.away, game.home].map((team) => (
            <AgateRow
              key={team.abbreviation}
              main={team.name}
              note="Group, path & matches"
              href={`/country/${team.abbreviation}`}
            />
          ))}
          {roundKeyFromStage(game.stage ?? "") ? (
            <AgateRow main="Bracket & schedule" href="/schedule" />
          ) : null}
        </section>

        {/* WATCH — agate row (no chevron: informational, not a link) */}
        {channel ? (
          <section className="px-[18px] pt-6">
            <SecHead name="Watch" />
            <AgateRow main={channel} note="U.S. broadcast" />
          </section>
        ) : null}

        {/* TrackControl — the §8 docking control (replaces PinControls) */}
        <div className="px-[18px] pt-6">
          <TrackControl
            gameId={game.id}
            live={isLive}
            pinned={pinned}
            onPin={onPin}
            onUnpin={onUnpin}
            pinnedLiveIds={pinnedLiveIds}
            startInput={startInput}
          />
        </div>

        {/* Share — hidden under No-Spoilers so a share never leaks the result */}
        {!noSpoilers ? (
          <div className="px-[18px] pb-1 pt-[18px] text-center">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 transition active:scale-[0.99]"
              style={{ color: "var(--ink)", fontWeight: 600, fontSize: 13 }}
            >
              Share this match
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Share modal — mounted once for both breakpoints. */}
      {shareOpen ? (
        <WCShareModal
          payload={{ kind: "wc-game", game }}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
     </GameSpoilerScope>
    </main>
  );
}

// ── Mobile ink-field event row (System D) ────────────────────────────────
// A goal / red-card row on the MATCH EVENTS ink field: mono minute, player +
// dim assist/team, and the cream-on-ink GOAL stamp (the one badge that inverts
// against the ink field). Rendered as a direct InkField child so the hairline
// divider between rows is drawn for it.
function InkEventRow({
  event,
  game,
}: {
  event: WCMatchEventLite;
  game: WCGameLite;
}) {
  const teamCode = teamCodeForEvent(game, event);
  const stamp = eventStamp(event.type);
  const dim = [
    event.assistName ? `assist ${event.assistName}` : null,
    teamCode || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="flex items-center gap-3 tabular-nums lining-nums"
      style={{ padding: "13px 0" }}
    >
      <span
        className="shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          minWidth: 32,
          color: "var(--cream-on-ink)",
        }}
      >
        {primeMinute(event.minute)}
      </span>
      <span
        className="min-w-0 flex-1"
        style={{ fontSize: 14, fontWeight: 600, color: "var(--cream-on-ink)" }}
      >
        {event.playerName || eventLabel(event)}
        {dim ? (
          <span
            style={{
              color: "var(--cream-on-ink-dim)",
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {" "}
            · {dim}
          </span>
        ) : null}
      </span>
      {stamp ? <GoalStamp>{stamp}</GoalStamp> : null}
    </div>
  );
}

// Cream-on-ink stamp — inverts against the ink field the way StakesStamp
// inverts against the accent field.
function GoalStamp({ children }: { children: string }) {
  return (
    <span
      className="inline-block shrink-0 whitespace-nowrap uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "3px 7px",
        background: "var(--cream-on-ink)",
        color: "var(--ink-field-bg)",
      }}
    >
      {children}
    </span>
  );
}

// Stamp text per event type. Yellow cards carry no stamp (they're filtered off
// the ink field). pen_goal / own_goal get their own short marks.
function eventStamp(type: WCMatchEventLite["type"]): string | null {
  switch (type) {
    case "goal":
      return "GOAL";
    case "pen_goal":
      return "PEN";
    case "own_goal":
      return "OG";
    case "red_card":
      return "RED";
    default:
      return null;
  }
}

function relevantMatchEvents(events: WCMatchEventLite[]): WCMatchEventLite[] {
  return events.filter((event) =>
    ["goal", "pen_goal", "own_goal", "red_card", "yellow_card"].includes(
      event.type
    )
  );
}

function formatMinute(minute: string): string {
  const clean = minute.replace(/:00$/, "").replace(/'$/, "");
  if (!clean) return "";
  return `${clean}'`;
}

// The typographic minute mark (′) for the System D ink register. Desktop rows
// keep the plain apostrophe formatMinute returns, so this stays local to the
// mobile ink field.
function primeMinute(minute: string): string {
  return formatMinute(minute).replace(/'/g, "′");
}

// Leading minute number for newest-first ordering on the ink field ("90'+3" →
// 90, "41'" → 41). Non-numeric feeds fall back to 0 (kept in feed order via the
// stable sort).
function minuteValue(minute: string): number {
  const n = parseInt(minute, 10);
  return Number.isNaN(n) ? 0 : n;
}

function teamCodeForEvent(game: WCGameLite, event: WCMatchEventLite): string {
  const teamId = event.teamId;
  if (!teamId) return "";
  if (teamId === game.home.id || teamId === game.home.abbreviation) {
    return game.home.abbreviation;
  }
  if (teamId === game.away.id || teamId === game.away.abbreviation) {
    return game.away.abbreviation;
  }
  return teamId;
}

function eventLabel(event: WCMatchEventLite): string {
  if (event.type === "red_card") return "Red card";
  if (event.type === "yellow_card") return "Yellow card";
  if (event.type === "pen_goal") return "Penalty goal";
  if (event.type === "own_goal") return "Own goal";
  return "Goal";
}




// Soccer-bespoke HeroMoment derivation. Mirrors NBA's deriveHero shape
// but uses kickoff / halftime / full-time / late-goal language.
export function deriveWCHero(game: WCGameLite): {
  eyebrow: string;
  headline: string;
  context?: string;
  live: boolean;
  /** True for the "Kicking off." in-between state — scheduled time passed
   *  but the feed hasn't flipped to live. The detail page keeps this deck
   *  (it isn't in the kicker) while suppressing the pre-kickoff ones. */
  imminent?: boolean;
} {
  if (game.status === "upcoming") {
    const d = new Date(game.date);
    const valid = !Number.isNaN(d.getTime());
    // The scoreboard card above already shows the stage and the exact
    // kickoff time. The preview only adds the day, so the two cards don't
    // both repeat "Summer Soccer · Group J" and "1:00 PM". No context line
    // here for the same reason — the stage lives on the scoreboard eyebrow.
    if (valid && d.getTime() <= Date.now()) {
      return {
        eyebrow: "Preview",
        headline: "Kicking off.",
        live: false,
        imminent: true,
      };
    }
    const dayWord = (() => {
      try {
        if (!valid) return "soon";
        const today = new Date().toDateString() === d.toDateString();
        return today ? "today" : d.toLocaleDateString(undefined, { weekday: "long" });
      } catch {
        return "soon";
      }
    })();
    return {
      eyebrow: "Preview",
      headline: `Kicks off ${dayWord}.`,
      live: false,
    };
  }

  if (game.status === "final") {
    const margin = Math.abs(game.away.score - game.home.score);
    if (margin === 0) {
      return { eyebrow: "Wrapped", headline: "Draw at full time.", live: false };
    }
    return { eyebrow: "Wrapped", headline: "Full time.", live: false };
  }

  // live
  const text = (game.statusText ?? "").toLowerCase();
  if (text.includes("delay") || text.includes("suspend")) {
    return { eyebrow: "Delayed", headline: "Match delayed.", context: "Play is paused.", live: true };
  }
  if (text.includes("ht") || text.includes("half")) {
    return { eyebrow: "Halftime", headline: "Halftime.", live: true };
  }
  if (text.includes("pen")) {
    return { eyebrow: "Shootout", headline: "Penalty shootout.", live: true };
  }
  // Parse the minute numerically — regex prefix matching called 100' "first
  // half" (the "10" matched ^[1-4]\d). Knockout matches run past 90.
  const minMatch = text.match(/(\d{1,3})/);
  const min = minMatch ? Number(minMatch[1]) : null;
  const isStoppage = /\d\s*'?\s*\+/.test(text);
  if (min != null && min > 90 && !isStoppage) {
    return { eyebrow: "Extra time", headline: "Extra time.", live: true };
  }
  if (min != null && min >= 90) {
    return { eyebrow: "Stoppage", headline: "Stoppage time.", live: true };
  }
  if (min != null && min > 45) {
    return { eyebrow: "Second half", headline: "Second half underway.", live: true };
  }
  if (min != null && min >= 1) {
    return { eyebrow: "First half", headline: "First half underway.", live: true };
  }
  return { eyebrow: "Live", headline: "Match underway.", live: true };
}
