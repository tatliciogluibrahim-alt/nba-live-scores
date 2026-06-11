import type { Game, TeamPerformers } from "../../nba/types";
import { deriveSeriesStake } from "../../companion/stakes/series-stakes";
import type { GameFacts, PerformerFacts } from "../narrative/types";

// NBA adapter: turns a live-feed Game into the sport-agnostic GameFacts
// the narrative core reasons over. This is the one file that knows about
// the Game shape; the narrative package stays clean so it can be
// extracted later. Other sports get their own adapter.

function leaderValue(value: string): number {
  const m = value.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Top scorer from the BOXSCORE (boxscore.players → TeamPerformers).
 *  This is the reliable source: the per-category `leaders` block is
 *  frequently empty for finals, which is why the narrative was getting
 *  topPerformer=null and could only write score lines. The boxscore is
 *  populated for every in-progress/final game. Highest PTS across both
 *  teams wins; carries that player's REB/AST so lines can read
 *  "Wembanyama went for 32 with 4 blocks" instead of just the score. */
function topPerformerFromBoxscore(
  performers: TeamPerformers[]
): PerformerFacts | null {
  let best: PerformerFacts | null = null;
  for (const team of performers) {
    for (const p of team.players) {
      if (!best || p.pts > best.pts) {
        best = {
          name: p.name,
          team: team.teamAbbreviation,
          pts: p.pts,
          ast: p.ast,
          reb: p.reb,
        };
      }
    }
  }
  return best && best.pts > 0 ? best : null;
}

/** Pull the top scorer plus their AST/REB from the game's leaders.
 *  Matches both long ("Points") and abbreviated ("PTS") labels. Fallback
 *  for when the boxscore performers aren't available. */
function topPerformer(game: Game): PerformerFacts | null {
  const leaders = game.leaders ?? [];
  const pts = leaders
    .filter((l) => /point|pts/i.test(l.label))
    .map((l) => ({ name: l.name, team: l.team ?? "", pts: leaderValue(l.value) }))
    .sort((a, b) => b.pts - a.pts)[0];
  if (!pts || pts.pts <= 0) return null;

  const same = leaders.filter((l) => l.name === pts.name);
  const ast = same.find((l) => /assist|ast/i.test(l.label));
  const reb = same.find((l) => /rebound|reb/i.test(l.label));
  return {
    name: pts.name,
    team: pts.team,
    pts: pts.pts,
    ast: ast ? leaderValue(ast.value) : 0,
    reb: reb ? leaderValue(reb.value) : 0,
  };
}

/** Collect every whole number that may legitimately appear in narrative
 *  text. The validator rejects anything outside this set. */
function groundedNumbers(
  away: number | null,
  home: number | null,
  margin: number | null,
  performer: PerformerFacts | null,
  seriesLine: string | null
): number[] {
  const nums = new Set<number>();
  for (const n of [away, home, margin]) if (n != null) nums.add(n);
  if (performer) {
    nums.add(performer.pts);
    if (performer.ast) nums.add(performer.ast);
    if (performer.reb) nums.add(performer.reb);
  }
  // Series figures like "leads 3-2" — let those digits through.
  for (const m of (seriesLine ?? "").matchAll(/\d+/g)) {
    nums.add(parseInt(m[0], 10));
  }
  return [...nums];
}

export function buildGameFactsFromGame(
  game: Game,
  /** Boxscore top-3-per-team from /api/nba-game-detail. When present it's
   *  the source of truth for the top performer; the `leaders`-based path
   *  is the fallback. Pass it whenever you've fetched game detail. */
  performers?: TeamPerformers[]
): GameFacts | null {
  if (game.status !== "final") return null;

  const awayScore = game.away.score ?? null;
  const homeScore = game.home.score ?? null;
  const haveScores = awayScore != null && homeScore != null;
  const margin = haveScores ? Math.abs(awayScore - homeScore) : null;
  const winnerCode = haveScores
    ? awayScore > homeScore
      ? game.away.abbreviation
      : game.home.abbreviation
    : null;
  const loserCode =
    winnerCode == null
      ? null
      : winnerCode === game.away.abbreviation
        ? game.home.abbreviation
        : game.away.abbreviation;

  const stake = deriveSeriesStake(game);
  // Prefer the boxscore performer (reliable); fall back to the flaky
  // per-category leaders only when the boxscore wasn't supplied.
  const performer =
    (performers && performers.length > 0
      ? topPerformerFromBoxscore(performers)
      : null) ?? topPerformer(game);

  return {
    gameId: game.id,
    sport: "nba",
    status: "final",
    away: {
      code: game.away.abbreviation,
      name: game.away.name ?? game.away.abbreviation,
      score: awayScore,
    },
    home: {
      code: game.home.abbreviation,
      name: game.home.name ?? game.home.abbreviation,
      score: homeScore,
    },
    winnerCode,
    loserCode,
    margin,
    seriesLine: stake?.line ?? null,
    seriesUrgent: stake?.urgent ?? false,
    topPerformer: performer,
    groundedNumbers: groundedNumbers(
      awayScore,
      homeScore,
      margin,
      performer,
      stake?.line ?? null
    ),
  };
}
