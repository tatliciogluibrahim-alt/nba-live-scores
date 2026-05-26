"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import type { Game, GameLeader, TeamComparisonStat } from "../../nba/types";

// Game Highlights — up to 3 distilled lines about a game.
//
// Slots, in priority order:
//   1. Top scorer — points first, because it scales across every game.
//   2. Team-level stat — rebound dominance, hot/cold three-point shooting,
//      assist disparity. Picks the most-extreme available signal.
//   3. Secondary leader — assists or rebounds when notable.
//   4. Story / narrative — comeback, OT, Q4 surge, blowout, close finish.
//      Skipped under No-Spoilers (the narrative IS the spoiler).
//   5. (Overflow) Series context — if seriesSummary tells us this game
//      clinched or shifted the series.
//
// We render up to 3 of these. Missing data is fine — the section
// simply shows fewer cards. We never pad with bland filler.
//
// No-Spoilers:
//   • Story is suppressed (closeness / margin / who-pulled-away signals).
//   • Player + team stat values are Spoiler-wrapped (numeric stat could
//     leak the winner). Eyebrow + player name stay visible because fans
//     want to know who played well without seeing the score.

type Highlight = {
  eyebrow: string;
  body: string;
  subjectName?: string;
  /** When true, the body is wrapped in <Spoiler> under No-Spoilers. */
  spoilery?: boolean;
};

export function HighlightsStack({ game }: { game: Game }) {
  const noSpoilers = useNoSpoilers();

  const isFinal = game.status === "final";
  const isLive = game.status === "live";
  if (!isFinal && !isLive) return null;

  const highlights = deriveHighlights(game, noSpoilers);

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Highlights</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {highlights.length === 0 ? (
        <p
          className="rounded-[14px] border px-4 py-3 text-[13px]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--mute-1)",
            fontWeight: 500,
          }}
        >
          {isLive
            ? "Highlights will update as the game develops."
            : "Highlights will appear when the snapshot is ready."}
        </p>
      ) : (
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
      )}
    </section>
  );
}

// ── Derivation ─────────────────────────────────────────────────────────

function deriveHighlights(game: Game, noSpoilers: boolean): Highlight[] {
  const isLive = game.status === "live";
  const out: Highlight[] = [];

  const performer = deriveTopPerformer(game);
  if (performer) out.push(performer);

  const teamStat = deriveTeamStat(game, isLive);
  if (teamStat) out.push(teamStat);

  const secondary = deriveSecondaryLeader(game, performer?.subjectName);
  if (secondary) out.push(secondary);

  // Story is final-only. Live games already say "Q3 underway." in the
  // HeroMoment / Series block — adding a "Game state" highlight here was
  // generic filler, not a real moment. Pre-Phase-8 this slot leaked
  // copy like "Q2 underway." into Highlights.
  if (!noSpoilers && !isLive && out.length < 3) {
    const story = deriveStory(game);
    if (story) out.push(story);
  }

  // Series context lives in its own canonical Series block under the
  // scoreboard (Phase 3). Don't duplicate it here as a "highlight" —
  // "NY leads the series 3–0." is structural context, not a moment.

  return out.slice(0, 3);
}

// ── Story ──────────────────────────────────────────────────────────────

function deriveStory(game: Game): Highlight | null {
  // Live games don't get a Story highlight — the HeroMoment band on the
  // game detail page already carries the live state. Repeating it here
  // turned Highlights into a status feed.
  if (game.status !== "final") return null;

  // For finals, pick the most interesting available story.
  const ot = detectOvertime(game);
  if (ot) return ot;

  const comeback = detectComeback(game);
  if (comeback) return comeback;

  const q4 = detectQ4Surge(game);
  if (q4) return q4;

  const margin = Math.abs(game.away.score - game.home.score);
  if (margin === 0) return { eyebrow: "Story", body: "Tied at the buzzer." };
  if (margin <= 3) return { eyebrow: "Story", body: "One-possession finish." };
  if (margin <= 6) return { eyebrow: "Story", body: "Close all night." };
  if (margin >= 20) return { eyebrow: "Story", body: `${margin}-point blowout.` };
  return { eyebrow: "Story", body: `Decided by ${margin}.` };
}

function detectOvertime(game: Game): Highlight | null {
  const len = game.periodScores?.away?.length ?? 0;
  if (len <= 4) return null;
  const otCount = len - 4;
  const label = otCount === 1 ? "Overtime." : `${otCount} overtimes.`;
  return { eyebrow: "Story", body: label };
}

function detectComeback(game: Game): Highlight | null {
  const a = game.periodScores?.away;
  const h = game.periodScores?.home;
  if (!a || !h || a.length < 2) return null;

  let aRun = 0;
  let hRun = 0;
  let maxAwayLead = 0;
  let maxHomeLead = 0;
  for (let i = 0; i < a.length; i++) {
    aRun += a[i] ?? 0;
    hRun += h[i] ?? 0;
    maxAwayLead = Math.max(maxAwayLead, aRun - hRun);
    maxHomeLead = Math.max(maxHomeLead, hRun - aRun);
  }

  const awayWon = game.away.score > game.home.score;
  const homeWon = game.home.score > game.away.score;

  if (awayWon && maxHomeLead >= 15) {
    return {
      eyebrow: "Story",
      body: `${game.away.abbreviation} erased a ${maxHomeLead}-point deficit.`,
    };
  }
  if (homeWon && maxAwayLead >= 15) {
    return {
      eyebrow: "Story",
      body: `${game.home.abbreviation} erased a ${maxAwayLead}-point deficit.`,
    };
  }
  return null;
}

function detectQ4Surge(game: Game): Highlight | null {
  const a = game.periodScores?.away;
  const h = game.periodScores?.home;
  if (!a || !h || a.length < 4) return null;
  const aQ4 = a[3] ?? 0;
  const hQ4 = h[3] ?? 0;
  const q4Margin = aQ4 - hQ4;
  const awayWon = game.away.score > game.home.score;
  const homeWon = game.home.score > game.away.score;

  // "Pulled away" only reads right if the team that took Q4 also won.
  // Q4 margin of 8+ feels meaningful without false-positiving normal runs.
  if (q4Margin >= 8 && awayWon) {
    return {
      eyebrow: "Story",
      body: `${game.away.abbreviation} pulled away in Q4.`,
    };
  }
  if (q4Margin <= -8 && homeWon) {
    return {
      eyebrow: "Story",
      body: `${game.home.abbreviation} pulled away in Q4.`,
    };
  }
  return null;
}

// ── Top performer ──────────────────────────────────────────────────────

function deriveTopPerformer(game: Game): Highlight | null {
  const pts = pickLeader(game.leaders, /point/i);
  if (!pts) return null;

  const ptsValue = leaderValueAsNumber(pts);
  if (ptsValue <= 0 || !isFinite(ptsValue)) return null;

  // Try to add a second stat from the SAME player if they also led
  // assists or rebounds and the secondary stat is "notable" enough to
  // mention. Avoids "X had 31 PTS, 2 AST" which adds noise.
  const samePlayer = game.leaders.filter((l) => l.name === pts.name);
  const ast = samePlayer.find((l) => /assist/i.test(l.label));
  const reb = samePlayer.find((l) => /rebound/i.test(l.label));
  const astValue = ast ? leaderValueAsNumber(ast) : 0;
  const rebValue = reb ? leaderValueAsNumber(reb) : 0;

  const team = pts.team ? ` (${pts.team})` : "";
  let body = `${pts.name}${team} · ${ptsValue} PTS`;
  // "Notable" thresholds for a secondary stat to be worth showing.
  if (astValue >= 6) body += `, ${astValue} AST`;
  else if (rebValue >= 8) body += `, ${rebValue} REB`;

  return { eyebrow: "Top scorer", body, subjectName: pts.name, spoilery: true };
}

function deriveSecondaryLeader(
  game: Game,
  excludeName?: string
): Highlight | null {
  const ast = pickLeader(game.leaders, /assist/i);
  const reb = pickLeader(game.leaders, /rebound/i);
  const astValue = ast ? leaderValueAsNumber(ast) : 0;
  const rebValue = reb ? leaderValueAsNumber(reb) : 0;

  if (ast && ast.name !== excludeName && astValue >= 6 && astValue >= rebValue) {
    const team = ast.team ? ` (${ast.team})` : "";
    return {
      eyebrow: "Playmaker",
      body: `${ast.name}${team} · ${astValue} AST`,
      subjectName: ast.name,
      spoilery: true,
    };
  }

  if (reb && reb.name !== excludeName && rebValue >= 8) {
    const team = reb.team ? ` (${reb.team})` : "";
    return {
      eyebrow: "On the glass",
      body: `${reb.name}${team} · ${rebValue} REB`,
      subjectName: reb.name,
      spoilery: true,
    };
  }

  return null;
}

// ── Team-level stat ────────────────────────────────────────────────────

function deriveTeamStat(game: Game, isLive: boolean): Highlight | null {
  const comp = game.teamComparison ?? [];
  if (comp.length === 0) return null;

  // Try each candidate; return the FIRST one that produces a meaningful
  // body. Ordering reflects narrative interest: rebound dominance >
  // shooting outliers > assist disparity. Tense is decided per-stat
  // since live and final read differently ("is leading the boards" vs
  // "won the boards").
  return (
    rebDominanceHighlight(game, comp, isLive) ||
    threePointOutlierHighlight(game, comp, isLive) ||
    assistDisparityHighlight(game, comp, isLive)
  );
}

function findStat(
  comp: TeamComparisonStat[],
  pattern: RegExp
): TeamComparisonStat | undefined {
  return comp.find((s) => pattern.test(s.label));
}

function parseStat(s: TeamComparisonStat): { a: number; h: number } | null {
  const a = parseFloat(s.away);
  const h = parseFloat(s.home);
  if (!isFinite(a) || !isFinite(h)) return null;
  return { a, h };
}

function rebDominanceHighlight(
  game: Game,
  comp: TeamComparisonStat[],
  isLive: boolean
): Highlight | null {
  const stat = findStat(comp, /^REB$|rebound/i);
  if (!stat) return null;
  const parsed = parseStat(stat);
  if (!parsed) return null;
  const margin = Math.abs(parsed.a - parsed.h);
  if (margin < 8) return null;
  const leaderCode = parsed.a > parsed.h ? game.away.abbreviation : game.home.abbreviation;
  const max = Math.max(parsed.a, parsed.h);
  const min = Math.min(parsed.a, parsed.h);
  // Live = present progressive ("is leading"), final = past tense ("won").
  // "won the boards" while the game is still in Q2 reads as the game
  // having ended — never use a finality verb on a live game.
  const body = isLive
    ? `${leaderCode} leading the glass, ${max}–${min}.`
    : `${leaderCode} won the boards, ${max}–${min}.`;
  return {
    eyebrow: "On the glass",
    body,
    spoilery: true,
  };
}

function threePointOutlierHighlight(
  game: Game,
  comp: TeamComparisonStat[],
  isLive: boolean
): Highlight | null {
  const stat = findStat(comp, /3P%|three/i);
  if (!stat) return null;
  const parsed = parseStat(stat);
  if (!parsed) return null;
  // Pick whichever team is at the extreme.
  const hot = parsed.a >= 45 || parsed.h >= 45;
  const cold = parsed.a <= 25 || parsed.h <= 25;
  if (!hot && !cold) return null;

  // Hot/cold are already present-tense adjectives — tense lives in the
  // verb. "is hot from three" for live, "were hot from three" for final.
  const verb = isLive ? "is" : "was";

  if (parsed.a >= 45 && parsed.a >= parsed.h) {
    return {
      eyebrow: "From deep",
      body: `${game.away.abbreviation} ${verb} hot from three (${formatPercent(parsed.a)}).`,
      spoilery: true,
    };
  }
  if (parsed.h >= 45) {
    return {
      eyebrow: "From deep",
      body: `${game.home.abbreviation} ${verb} hot from three (${formatPercent(parsed.h)}).`,
      spoilery: true,
    };
  }
  if (parsed.a <= 25 && parsed.a <= parsed.h) {
    return {
      eyebrow: "From deep",
      body: `${game.away.abbreviation} ${verb} cold from three (${formatPercent(parsed.a)}).`,
      spoilery: true,
    };
  }
  if (parsed.h <= 25) {
    return {
      eyebrow: "From deep",
      body: `${game.home.abbreviation} ${verb} cold from three (${formatPercent(parsed.h)}).`,
      spoilery: true,
    };
  }
  return null;
}

function assistDisparityHighlight(
  game: Game,
  comp: TeamComparisonStat[],
  isLive: boolean
): Highlight | null {
  const stat = findStat(comp, /^AST$|assist/i);
  if (!stat) return null;
  const parsed = parseStat(stat);
  if (!parsed) return null;
  const margin = Math.abs(parsed.a - parsed.h);
  if (margin < 7) return null;
  const leaderCode = parsed.a > parsed.h ? game.away.abbreviation : game.home.abbreviation;
  const max = Math.max(parsed.a, parsed.h);
  // "ran the offense" is a finality phrase — live games haven't run
  // anything yet, they're running it. Switch to present progressive.
  const body = isLive
    ? `${leaderCode} moving the ball, ${max} assists.`
    : `${leaderCode} ran the offense, ${max} assists.`;
  return {
    eyebrow: "Ball movement",
    body,
    spoilery: true,
  };
}

// Series context used to be surfaced here as a "highlight," but
// "NY leads the series 3–0." is structural state, not a moment. The
// consolidated Series block under the scoreboard (see NBALiveCompanion)
// is now the single home for series summaries — keeping a duplicate
// helper here would invite a regression.

// ── Utilities ──────────────────────────────────────────────────────────

function leaderValueAsNumber(l: GameLeader): number {
  const m = l.value.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : Number.NEGATIVE_INFINITY;
}

function pickLeader(
  leaders: GameLeader[],
  pattern: RegExp
): GameLeader | undefined {
  const candidates = leaders.filter((l) => pattern.test(l.label));
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => leaderValueAsNumber(b) - leaderValueAsNumber(a))[0];
}

function formatPercent(n: number): string {
  // ESPN sometimes already includes %, sometimes returns just the number.
  // Always output a clean integer percentage.
  return `${Math.round(n)}%`;
}
