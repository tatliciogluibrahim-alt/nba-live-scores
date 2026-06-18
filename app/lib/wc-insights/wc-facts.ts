import type { GameFacts, ScorerFacts } from "../narrative/types";
import type { WCGameLite, WCMatchEventLite } from "../../companion/today/today-data";

// Soccer adapter: turns a finished Summer Soccer match (the live-feed
// WCGameLite, which carries goal events) into the sport-agnostic
// GameFacts the narrative core reasons over. Mirrors the NBA adapter in
// app/lib/brief/narrative-facts.ts — this is the one soccer file that
// knows the WCGameLite shape; the narrative package stays sport-clean.
//
// Goals only count toward a scorer when they're real goals or penalties
// in open play (a player's own goal credits the OTHER team's score, but
// isn't that player's "scorer" achievement, so it's excluded here).

function scorersFromEvents(
  events: WCMatchEventLite[],
  homeId: string,
  homeCode: string,
  awayId: string,
  awayCode: string
): ScorerFacts[] {
  const tally = new Map<string, ScorerFacts>();
  for (const e of events) {
    if (e.type !== "goal" && e.type !== "pen_goal") continue;
    const name = e.playerName?.trim();
    if (!name) continue;
    const team =
      e.teamId === homeId ? homeCode : e.teamId === awayId ? awayCode : "";
    const key = `${name}|${team}`;
    const cur = tally.get(key);
    if (cur) cur.goals += 1;
    else tally.set(key, { name, team, goals: 1 });
  }
  return Array.from(tally.values()).sort((a, b) => b.goals - a.goals);
}

function groundedNumbers(
  away: number,
  home: number,
  margin: number,
  scorers: ScorerFacts[],
  stakeLine: string | null
): number[] {
  const nums = new Set<number>([away, home, margin, away + home]);
  for (const s of scorers) nums.add(s.goals);
  for (const m of (stakeLine ?? "").matchAll(/\d+/g)) {
    nums.add(parseInt(m[0], 10));
  }
  return [...nums];
}

export function buildWCFactsFromGame(
  game: WCGameLite,
  stakeLine?: string | null
): GameFacts | null {
  if (game.status !== "final") return null;

  const awayScore = game.away.score ?? 0;
  const homeScore = game.home.score ?? 0;
  const margin = Math.abs(awayScore - homeScore);
  const draw = awayScore === homeScore;
  const winnerCode = draw
    ? null
    : awayScore > homeScore
      ? game.away.abbreviation
      : game.home.abbreviation;
  const loserCode =
    winnerCode == null
      ? null
      : winnerCode === game.away.abbreviation
        ? game.home.abbreviation
        : game.away.abbreviation;

  const scorers = scorersFromEvents(
    game.events ?? [],
    game.home.id ?? "",
    game.home.abbreviation,
    game.away.id ?? "",
    game.away.abbreviation
  );

  const stake = stakeLine ?? null;

  return {
    gameId: game.id,
    sport: "wc",
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
    seriesLine: null,
    seriesUrgent: false,
    topPerformer: null,
    scorers,
    stage: game.stage || (game.group ? `Group ${game.group}` : "Summer Soccer"),
    stakeLine: stake,
    groundedNumbers: groundedNumbers(awayScore, homeScore, margin, scorers, stake),
  };
}
