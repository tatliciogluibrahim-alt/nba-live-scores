"use client";

import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { ScoreModule } from "../atoms/ScoreModule";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { HeroMoment } from "../moments/HeroMoment";
import { Spoiler } from "../spoiler/Spoiler";
import { RevealResultsButton } from "../spoiler/RevealResultsButton";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { useNoSpoilers } from "../providers";
import { WatchLine } from "../watch/WatchLine";
import Link from "next/link";
import type { WCGameLite, WCMatchEventLite } from "../today/today-data";
import { PinControls } from "./PinControls";
import { WCShareModal } from "../share/WCShareModal";

// Summer Soccer game detail. Mirrors NBALiveCompanion's structure (H1 →
// ScoreModule → HeroMoment → WatchLine → Highlights → PinControls) but
// with soccer-bespoke copy:
//   • "Kickoff" instead of "Tipoff"
//   • "Halftime / Stoppage time" instead of quarter language
//   • Goals as the score unit
//
// Optional `highlights` prop lets the preview route inject mock content
// since the WC live data feed doesn't expose top-scorer / shot leaders
// the way the NBA endpoint does. When real WC data lands (Phase 3), the
// adapter can populate this prop with derived stats and the UI doesn't
// change.

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
  highlights = [],
}: {
  game: WCGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  highlights?: WCHighlight[];
}) {
  // Hidden when the global toggle is on OR a hide-spoilers country/series
  // follow covers this match (selective), minus a session reveal. The
  // GameSpoilerScope below shares the decision with every child.
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [game.away.abbreviation, game.home.abbreviation],
  });
  const baseHidden = globalNoSpoilers || followHidden;
  const { isRevealed } = useReveal();
  const noSpoilers = baseHidden && !isRevealed(game.id);
  const [shareOpen, setShareOpen] = useState(false);
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";

  // Soccer status labels. "HT" (halftime), "FT" (full time), "90'+3"
  // style strings come from the feed; we surface them verbatim when
  // present, fall back to generic tier labels otherwise.
  const statusLabel =
    isLive && game.statusText
      ? game.statusText.toUpperCase()
      : status.toUpperCase();

  // Soccer-bespoke context line.
  const contextLine = isUpcoming
    ? new Date(game.date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : isLive
      ? game.statusText
      : "Full time";

  // HeroMoment content for WC.
  const hero = deriveWCHero(game);

  const channel = game.broadcasts[0] ?? game.watchLabel ?? null;
  const matchEvents = relevantMatchEvents(game.events ?? []);
  const derivedHighlights = deriveWCHighlights(game, highlights);

  // Reference material (match events + highlights). On desktop (md+)
  // these move to a sticky right rail so the main column stays focused
  // on the moment (scoreboard, hero, watch, pin). On mobile they render
  // inline in their original positions (the rail is hidden, the inline
  // copies show). Mirrors NBALiveCompanion's per-quarter / highlights
  // rail. Pure presentational JSX, so double-mounting at md+ is free.
  const matchEventsSection =
    matchEvents.length > 0 ? (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Match events</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <ul className="space-y-1.5">
          {matchEvents.map((event, index) => {
            // Event hierarchy: goals / penalties / red cards are the match
            // story and get the full card. Yellow cards are routine, so
            // they drop to a light row (no border/fill) and stop visually
            // competing with goals.
            const isMajor =
              event.type === "goal" ||
              event.type === "pen_goal" ||
              event.type === "own_goal" ||
              event.type === "red_card";
            return (
            <li
              key={`${event.minute}-${event.type}-${event.playerName}-${index}`}
              className={
                isMajor ? "rounded-[14px] border px-3 py-2.5" : "px-3 py-1"
              }
              style={
                isMajor
                  ? { background: "var(--paper)", borderColor: "var(--line)" }
                  : undefined
              }
            >
              {noSpoilers ? (
                <p
                  className="text-[13px]"
                  style={{ color: "var(--ink)", fontWeight: 700 }}
                >
                  <Spoiler ariaSubject={subject} gameId={game.id}>
                    {formatEventText(event, game)}
                  </Spoiler>
                </p>
              ) : (
                <MatchEventRow event={event} game={game} />
              )}
            </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  const highlightsSection =
    !isUpcoming && derivedHighlights.length > 0 ? (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Highlights</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <ul className="space-y-2">
          {derivedHighlights.map((h, i) => (
            <li
              key={i}
              className="rounded-[14px] border px-3 py-3"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <Eyebrow>{h.eyebrow}</Eyebrow>
              <p
                className="mt-1 text-[14px] leading-snug"
                style={{
                  color: "var(--ink)",
                  fontWeight: 700,
                  letterSpacing: "-0.005em",
                }}
              >
                {h.spoilery && noSpoilers ? (
                  <Spoiler ariaSubject={subject} gameId={game.id}>
                    {h.body}
                  </Spoiler>
                ) : (
                  h.body
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-4xl md:pt-2">
     <GameSpoilerScope gameId={game.id} hidden={baseHidden}>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-6 md:items-start">
       <div>
      {/* Big editorial matchup — Bricolage 700, mute center dot, full
          team names (Watching · Game handoff). */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 0.96,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
        }}
      >
        {game.away.abbreviation}
        <span style={{ color: "var(--mute-1)", fontWeight: 400, padding: "0 6px" }}>
          ·
        </span>
        {game.home.abbreviation}
      </h1>
      <p
        className="mt-1.5 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {/* ── Scoreboard ──────────────────────────────────────────────── */}
      <div
        className="mt-4 rounded-[14px] border px-4 py-4"
        style={{
          background: isLive ? "var(--wc-soft)" : "var(--paper)",
          borderColor: "var(--line)",
        }}
      >
        <ScoreModule
          eyebrow={game.stage ? `Summer Soccer · ${game.stage}` : "Summer Soccer"}
          away={{ code: game.away.abbreviation, name: game.away.name }}
          home={{ code: game.home.abbreviation, name: game.home.name }}
          awayScore={isUpcoming ? null : game.away.score}
          homeScore={isUpcoming ? null : game.home.score}
          status={status}
          statusLabel={statusLabel}
          contextLine={contextLine}
          spoilerSubject={subject}
          gameId={game.id}
          size="lg"
          hideMatchup
          // Game Pulse rail — same lock-screen parity element as the NBA
          // detail. WC uses the green accent + KICKOFF/90' rail. Live =
          // minute progress; final = settled filled rail. Upcoming omits.
          progress={
            isUpcoming
              ? undefined
              : {
                  value: computeLiveActivityProgress(
                    "wc",
                    game.statusText,
                    status
                  ),
                  sport: "wc",
                  accent: "var(--wc)",
                }
          }
        />
      </div>

      {/* One reveal for the whole match — flips the score, match events,
          and highlights at once. Finished/live games under No-Spoilers. */}
      {!isUpcoming ? (
        <div className="mt-3">
          <RevealResultsButton
            gameId={game.id}
            kind={isLive ? "live" : "final"}
          />
        </div>
      ) : null}

      {/* ── Match events (mobile inline; desktop → rail) ─────────────── */}
      {matchEventsSection ? (
        <div className="mt-4 md:hidden">{matchEventsSection}</div>
      ) : null}

      {/* ── Hero moment ──────────────────────────────────────────────── */}
      <div className="mt-3">
        <HeroMoment
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          context={hero.context}
          accent="var(--wc)"
          live={hero.live}
          surface={isLive ? "var(--wc-soft)" : undefined}
          muted={game.status === "final"}
        />
      </div>

      {/* ── Both countries — group context + jump into each country's
          page. Gives an upcoming match (which has no events/highlights
          yet) somewhere to go: group, path, and fixtures per side. ── */}
      <section className="mt-4">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow color="var(--wc)">
            {game.group ? `Group ${game.group}` : "Summer Soccer"}
          </Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[game.away, game.home].map((team) => (
            <Link
              key={team.abbreviation}
              href={`/country/${team.abbreviation}`}
              aria-label={`Open ${team.name}`}
              className="rounded-[14px] border px-3 py-3 transition active:scale-[0.98]"
              style={{ background: "var(--paper)", borderColor: "var(--line)" }}
            >
              <p
                className="text-[15px] leading-tight"
                style={{ color: "var(--ink)", fontWeight: 700 }}
              >
                {team.name}
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                Group, path & matches →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Highlights (mobile inline; desktop → rail) ───────────────── */}
      {highlightsSection ? (
        <div className="mt-4 md:hidden">{highlightsSection}</div>
      ) : null}

      {/* ── Broadcast (bottom group: broadcast → pin → footnote) ──────── */}
      {channel ? (
        <div className="mt-4">
          <WatchLine channel={channel} ariaSubject={subject} />
        </div>
      ) : null}

      {/* ── Pin / Watching (PinControls carries the footnote) ─────────── */}
      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={subject}
        gameStatus={status}
        className="mt-3"
      />

      {/* Share — a calm card with the score/stage + nonoisescores.app, the
          organic growth artifact. Hidden under No-Spoilers so a share
          never leaks the result the user is hiding. */}
      {!noSpoilers ? (
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 px-1 text-[13px] transition active:scale-[0.99]"
          style={{ color: "var(--mute-1)", fontWeight: 600 }}
        >
          Share this match
          <span aria-hidden>→</span>
        </button>
      ) : null}

      {shareOpen ? (
        <WCShareModal
          payload={{ kind: "wc-game", game }}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
       </div>

       {/* ── Right rail (desktop md+ only) ────────────────────────────
           Sticky reference column: match events + highlights. Hidden on
           mobile (the inline copies above carry it there). Wrapper only
           renders when there's something to show. */}
       {matchEventsSection || highlightsSection ? (
         <aside className="mt-5 hidden md:mt-0 md:block">
           <div className="sticky top-4 space-y-4">
             {matchEventsSection}
             {highlightsSection}
           </div>
         </aside>
       ) : null}
      </div>
     </GameSpoilerScope>
    </main>
  );
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

function formatEventText(event: WCMatchEventLite, game: WCGameLite): string {
  const team = teamCodeForEvent(game, event);
  const minute = formatMinute(event.minute);
  const assist = event.assistName ? `, assist ${event.assistName}` : "";
  return [
    minute,
    eventLabel(event),
    event.playerName || team,
    team ? `(${team})` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .concat(assist);
}

function MatchEventRow({
  event,
  game,
}: {
  event: WCMatchEventLite;
  game: WCGameLite;
}) {
  const teamCode = teamCodeForEvent(game, event);
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-10 shrink-0 text-[12px]"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
        }}
      >
        {formatMinute(event.minute)}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          {event.playerName || eventLabel(event)}
          {teamCode ? ` · ${teamCode}` : ""}
        </p>
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {eventLabel(event)}
          {event.assistName ? ` · Assist ${event.assistName}` : ""}
        </p>
      </div>
    </div>
  );
}

function deriveWCHighlights(
  game: WCGameLite,
  supplied: WCHighlight[]
): WCHighlight[] {
  const derived: WCHighlight[] = [];
  const events = relevantMatchEvents(game.events ?? []);
  // Positive goal filter — now that yellow_card flows through
  // relevantMatchEvents, a "!== red_card" filter would miscount yellows
  // as goals.
  const goals = events.filter(
    (e) => e.type === "goal" || e.type === "pen_goal" || e.type === "own_goal"
  );
  const reds = events.filter((e) => e.type === "red_card");

  // When the Match Events timeline is showing, it already narrates every
  // goal/card. Highlights should only add what the timeline DOESN'T —
  // multi-goal stories (brace/hat-trick), multi-assist games — not a
  // "Scorer · 1 goal" line that just repeats a row above. When there's
  // no timeline (no events, e.g. supplied-data-only path), the derived
  // lines act as the fallback.
  const hasTimeline = events.length > 0;

  const scorerCounts = new Map<string, { name: string; team: string; goals: number }>();
  for (const event of goals) {
    if (event.type === "own_goal") continue;
    const team = teamCodeForEvent(game, event);
    const key = `${event.playerName}-${team}`;
    const prev = scorerCounts.get(key) ?? { name: event.playerName, team, goals: 0 };
    scorerCounts.set(key, { ...prev, goals: prev.goals + 1 });
  }
  const topScorer = Array.from(scorerCounts.values()).sort(
    (a, b) => b.goals - a.goals
  )[0];
  if (topScorer?.name && topScorer.goals >= 2) {
    // A brace/hat-trick is a story the timeline doesn't tell in one line.
    derived.push({
      eyebrow: topScorer.goals >= 3 ? "Hat-trick" : "Brace",
      body: `${topScorer.name}${topScorer.team ? ` (${topScorer.team})` : ""} · ${topScorer.goals} goals`,
      spoilery: true,
    });
  } else if (topScorer?.name && !hasTimeline) {
    // Fallback only: no timeline to carry the goal, so name the scorer.
    derived.push({
      eyebrow: "Scorer",
      body: `${topScorer.name}${topScorer.team ? ` (${topScorer.team})` : ""} · ${topScorer.goals} ${topScorer.goals === 1 ? "goal" : "goals"}`,
      spoilery: true,
    });
  }

  const assistCounts = new Map<string, { name: string; assists: number }>();
  for (const event of goals) {
    if (!event.assistName) continue;
    const prev = assistCounts.get(event.assistName) ?? {
      name: event.assistName,
      assists: 0,
    };
    assistCounts.set(event.assistName, { ...prev, assists: prev.assists + 1 });
  }
  const topAssist = Array.from(assistCounts.values()).sort(
    (a, b) => b.assists - a.assists
  )[0];
  // A multi-assist game is a distinct aggregate the per-goal timeline
  // doesn't surface; a single assist already shows on its goal row.
  if (topAssist?.name && (topAssist.assists >= 2 || !hasTimeline)) {
    derived.push({
      eyebrow: "Playmaker",
      body: `${topAssist.name} · ${topAssist.assists} ${topAssist.assists === 1 ? "assist" : "assists"}`,
      spoilery: true,
    });
  }

  // The red card is already a row in the timeline — only call it out
  // separately when there's no timeline to carry it.
  if (reds[0] && !hasTimeline) {
    const team = teamCodeForEvent(game, reds[0]);
    derived.push({
      eyebrow: "Discipline",
      body: `${reds[0].playerName || team} saw red${formatMinute(reds[0].minute) ? ` at ${formatMinute(reds[0].minute)}` : ""}.`,
      spoilery: true,
    });
  }

  return [...derived, ...supplied].slice(0, 3);
}

// Soccer-bespoke HeroMoment derivation. Mirrors NBA's deriveHero shape
// but uses kickoff / halftime / full-time / late-goal language.
function deriveWCHero(game: WCGameLite): {
  eyebrow: string;
  headline: string;
  context?: string;
  live: boolean;
} {
  if (game.status === "upcoming") {
    const d = new Date(game.date);
    const valid = !Number.isNaN(d.getTime());
    // The scoreboard card above already shows the stage and the exact
    // kickoff time. The preview only adds the day, so the two cards don't
    // both repeat "Summer Soccer · Group J" and "1:00 PM". No context line
    // here for the same reason — the stage lives on the scoreboard eyebrow.
    if (valid && d.getTime() <= Date.now()) {
      return { eyebrow: "Preview", headline: "Kicking off.", live: false };
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
  if (text.match(/9\d/)) {
    return { eyebrow: "Stoppage", headline: "Stoppage time.", live: true };
  }
  if (text.match(/^[1-4]\d/)) {
    return { eyebrow: "First half", headline: "First half underway.", live: true };
  }
  if (text.match(/^[5-8]\d/)) {
    return { eyebrow: "Second half", headline: "Second half underway.", live: true };
  }
  return { eyebrow: "Live", headline: "Match underway.", live: true };
}
