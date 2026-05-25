"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import type { Game, GameLeader } from "../../nba/types";

// Highlights — three high-signal lines about a game. Replaces the old
// play-by-play "Key moments" list, which felt like reading a transcript
// rather than learning what happened.
//
// What we render:
//   1. Game character  — derived from margin + status. Tells you the
//                        shape of the game in one phrase.
//   2. Top scorer      — the player with the highest points value
//                        across both teams (from the API's `leaders`).
//   3. Other top stat  — top assist or rebound, whichever leader the
//                        feed surfaces. Picks the more notable one.
//
// No-Spoilers gating:
//   • Game character leaks closeness/blowout — suppressed entirely.
//   • Player stats are technically inferable as winner-leaning, so the
//     value (e.g. "31 PTS") is wrapped in <Spoiler>. The player's name
//     and team are shown — fans want to know who's playing well even
//     when they don't want the score yet.

type Highlight = {
  eyebrow: string;
  body: string;
  /** When true, the body should be wrapped in <Spoiler> under
   *  No-Spoilers (numeric stat that could leak winner). */
  spoilery?: boolean;
};

export function HighlightsStack({ game }: { game: Game }) {
  const noSpoilers = useNoSpoilers();

  const isFinal = game.status === "final";
  const isLive = game.status === "live";
  if (!isFinal && !isLive) return null;

  const highlights = deriveHighlights(game, noSpoilers);
  if (highlights.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Highlights</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <ul className="space-y-2">
        {highlights.map((h, i) => (
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
                <Spoiler ariaSubject={`${game.away.abbreviation} vs ${game.home.abbreviation}`}>
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
  );
}

function deriveHighlights(game: Game, noSpoilers: boolean): Highlight[] {
  const out: Highlight[] = [];

  // 1. Game character — directly leaks closeness, so we drop it under
  //    No-Spoilers entirely (rather than blur it, which would still
  //    let "Highlights" mention closeness in aria text).
  if (!noSpoilers) {
    const character = deriveCharacter(game);
    if (character) out.push({ eyebrow: "Game character", body: character });
  }

  // 2. Top scorer
  const scorer = pickPointsLeader(game.leaders);
  if (scorer) {
    out.push({
      eyebrow: "Top scorer",
      body: formatLeader(scorer),
      spoilery: true,
    });
  }

  // 3. Secondary stat — prefer assists if both teams have a real assist
  //    leader, otherwise rebounds. ESPN sometimes gives only one or the
  //    other for a given matchup.
  const secondary = pickAssistsLeader(game.leaders) ?? pickReboundsLeader(game.leaders);
  if (secondary) {
    const label = /assist/i.test(secondary.label) ? "Top assist" : "Top rebound";
    out.push({
      eyebrow: label,
      body: formatLeader(secondary),
      spoilery: true,
    });
  }

  return out;
}

function deriveCharacter(game: Game): string | null {
  const margin = Math.abs(game.away.score - game.home.score);
  if (game.status === "live") {
    if (game.period >= 4 && margin <= 5) return "One-possession game in Q4.";
    if (game.period >= 4) return "Q4 underway.";
    if (game.period === 0 || game.period == null) return "Game underway.";
    return `Q${game.period} underway.`;
  }
  // final
  if (margin <= 3) return "One-possession finish.";
  if (margin <= 6) return "Close all night.";
  if (margin <= 12) return "Steady win.";
  if (margin <= 20) return `${margin}-point win.`;
  return "Blowout.";
}

function leaderValueAsNumber(l: GameLeader): number {
  // values look like "31", "12.5", or "8 (3 OREB)". Pull the first
  // numeric span. NaN means we sort it to the bottom.
  const m = l.value.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : Number.NEGATIVE_INFINITY;
}

function pickPointsLeader(leaders: GameLeader[]): GameLeader | undefined {
  const candidates = leaders.filter((l) => /point/i.test(l.label));
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => leaderValueAsNumber(b) - leaderValueAsNumber(a))[0];
}

function pickAssistsLeader(leaders: GameLeader[]): GameLeader | undefined {
  const candidates = leaders.filter((l) => /assist/i.test(l.label));
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => leaderValueAsNumber(b) - leaderValueAsNumber(a))[0];
}

function pickReboundsLeader(leaders: GameLeader[]): GameLeader | undefined {
  const candidates = leaders.filter((l) => /rebound/i.test(l.label));
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => leaderValueAsNumber(b) - leaderValueAsNumber(a))[0];
}

function formatLeader(l: GameLeader): string {
  // "SGA · 31 PTS" — name (or short name from leader), middle dot,
  // value with a label suffix when the label is short enough.
  const suffix = shortLabel(l.label);
  const value = suffix ? `${l.value} ${suffix}` : l.value;
  const team = l.team ? ` (${l.team})` : "";
  return `${l.name}${team} · ${value}`;
}

function shortLabel(label: string): string {
  // ESPN labels vary: "Points", "PPG", "Rebounds", "REB", "Assists",
  // "AST". Normalize to a tight 3-letter suffix when the value alone
  // wouldn't read clearly.
  if (/^point/i.test(label) || /PPG/i.test(label)) return "PTS";
  if (/^rebound/i.test(label) || /^REB/i.test(label)) return "REB";
  if (/^assist/i.test(label) || /^AST/i.test(label)) return "AST";
  return "";
}
