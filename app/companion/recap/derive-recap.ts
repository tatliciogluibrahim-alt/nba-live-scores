// Quiet Recap derivation. Composes the data the recap card needs into
// one tidy shape:
//
//   • Headline verb — "Knicks took it." / "Wrapped." / "Final."
//     depending on whether we can name the winner. Always spoiler-safe
//     in copy — Spoiler-wrapping happens at render time when noSpoilers.
//   • Score line.
//   • Series state line (when applicable, NBA-only today).
//   • Up to 3 "what mattered" bullets, distilled from the same
//     HighlightsStack logic used on the game detail page.
//   • Optional "next" line (next game in the series, when present).
//
// Pure function — no I/O, no React, no DOM. The card component
// renders the shape, the email composer will too.
//
// Cross-sport ready: NBA shape lands now. WC matches go through a
// parallel `deriveWCRecap` once kickoff lands and we have rich match
// events. NFL ships when the play-by-play parser ships in Phase 12.

import type { Game } from "../../nba/types";
import { deriveNBASeriesStake } from "../stakes/derive-stakes";

export type RecapBullet = {
  /** Short caps eyebrow ("Top scorer", "Triple-double", "Q4 push"). */
  eyebrow: string;
  /** One-sentence body. Already terminates with a period. */
  body: string;
  /** When true, the bullet reveals outcome/closeness — caller wraps
   *  with <Spoiler> under No-Spoilers. */
  spoilery: boolean;
};

export type NBARecap = {
  source: "nba";
  /** Calm editorial headline. Names the winner when we can; falls back
   *  to "Wrapped." / "Final." otherwise. */
  headline: string;
  /** Subtle whether the headline names the winner — caller treats this
   *  the same way as bullet.spoilery for the headline cell. */
  headlineSpoilery: boolean;
  /** Score line as "AWAY · HOME" + scores in mono. The card splits
   *  these so the score numbers tabular-align. */
  awayCode: string;
  awayScore: number;
  homeCode: string;
  homeScore: number;
  /** Optional series state line, e.g. "Series · NY leads 3–0." Null
   *  for non-playoff games. */
  seriesLine: string | null;
  /** Up to 3 bullets. Empty array is fine — the card still renders
   *  the headline + score; just skips the "What mattered" block. */
  bullets: RecapBullet[];
  /** Optional "Next" line — "Next: Game 4 · Monday · 8:00 PM" when
   *  the series continues. Null when the series wrapped or we don't
   *  know what's next. */
  nextLine: string | null;
};

function pickLeaderValue(
  leaders: Game["leaders"],
  pattern: RegExp
): { name: string; team: string; value: number } | null {
  const candidates = (leaders ?? []).filter((l) => pattern.test(l.label));
  if (candidates.length === 0) return null;
  const parsed = candidates
    .map((l) => {
      const m = l.value.match(/(\d+(?:\.\d+)?)/);
      const v = m ? parseFloat(m[1]) : Number.NEGATIVE_INFINITY;
      return { name: l.name, team: l.team ?? "", value: v };
    })
    .sort((a, b) => b.value - a.value);
  const top = parsed[0];
  if (!top || !isFinite(top.value)) return null;
  return top;
}

/** "Brunson (NYK) · 32 PTS" / "Brunson · 32–10–10 triple-double" */
function topPerformerBullet(game: Game): RecapBullet | null {
  const pts = pickLeaderValue(game.leaders, /point/i);
  if (!pts) return null;

  const samePlayer = (game.leaders ?? []).filter((l) => l.name === pts.name);
  const ast = samePlayer.find((l) => /assist/i.test(l.label));
  const reb = samePlayer.find((l) => /rebound/i.test(l.label));
  const astValue = ast ? parseInt(ast.value, 10) || 0 : 0;
  const rebValue = reb ? parseInt(reb.value, 10) || 0 : 0;

  const team = pts.team ? ` (${pts.team})` : "";
  const subject = `${pts.name}${team}`;

  if (pts.value >= 10 && rebValue >= 10 && astValue >= 10) {
    return {
      eyebrow: "Triple-double",
      body: `${subject} · ${pts.value}–${rebValue}–${astValue}.`,
      spoilery: true,
    };
  }
  const isDD = pts.value >= 10 && (astValue >= 10 || rebValue >= 10);
  if (isDD) {
    const second = rebValue >= 10 ? `${rebValue} REB` : `${astValue} AST`;
    return {
      eyebrow: "Double-double",
      body: `${subject} · ${pts.value} PTS, ${second}.`,
      spoilery: true,
    };
  }

  let eyebrow = "Top scorer";
  if (pts.value >= 40) eyebrow = "40-point night";
  else if (pts.value >= 30) eyebrow = "30-point night";

  let body = `${subject} · ${pts.value} PTS`;
  if (astValue >= 6) body += `, ${astValue} AST`;
  else if (rebValue >= 8) body += `, ${rebValue} REB`;
  body += ".";
  return { eyebrow, body, spoilery: true };
}

/** Team rebound dominance: "NY won the boards, 48–35." */
function reboundBullet(game: Game): RecapBullet | null {
  const stat = game.teamComparison?.find((s) => /^REB$|rebound/i.test(s.label));
  if (!stat) return null;
  const a = parseFloat(stat.away);
  const h = parseFloat(stat.home);
  if (!isFinite(a) || !isFinite(h)) return null;
  if (Math.abs(a - h) < 8) return null;
  const winnerCode =
    a > h ? game.away.abbreviation : game.home.abbreviation;
  const max = Math.max(a, h);
  const min = Math.min(a, h);
  return {
    eyebrow: "On the glass",
    body: `${winnerCode} won the boards, ${max}–${min}.`,
    spoilery: true,
  };
}

/** Hot/cold 3pt: "NY went 15-of-32 from three (47%)." */
function threeBullet(game: Game): RecapBullet | null {
  const pct = game.teamComparison?.find((s) =>
    /3P%|3-Point %|three.*pct|three.*%/i.test(s.label)
  );
  if (!pct) return null;
  const a = parseFloat(pct.away);
  const h = parseFloat(pct.home);
  if (!isFinite(a) || !isFinite(h)) return null;
  const hot = a >= 45 || h >= 45;
  const cold = a <= 25 || h <= 25;
  if (!hot && !cold) return null;

  const volStat = game.teamComparison?.find((s) =>
    /^3PT\b|3PM-3PA|3-Point Field Goals/i.test(s.label)
  );
  const parseMA = (raw: string) => {
    const m = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (!m) return null;
    return { made: Number(m[1]), att: Number(m[2]) };
  };

  const buildBody = (
    teamCode: string,
    pctValue: number,
    side: "away" | "home",
    mood: "hot" | "cold"
  ): string => {
    const vol = volStat ? parseMA(volStat[side]) : null;
    const verb = mood === "hot" ? "lit it up" : "couldn't connect";
    const tail = vol
      ? `${vol.made}-of-${vol.att} from three (${Math.round(pctValue)}%).`
      : `${Math.round(pctValue)}% from three.`;
    return `${teamCode} ${verb}: ${tail}`;
  };

  if (a >= 45 && a >= h) {
    return {
      eyebrow: "From deep",
      body: buildBody(game.away.abbreviation, a, "away", "hot"),
      spoilery: true,
    };
  }
  if (h >= 45) {
    return {
      eyebrow: "From deep",
      body: buildBody(game.home.abbreviation, h, "home", "hot"),
      spoilery: true,
    };
  }
  if (a <= 25 && a <= h) {
    return {
      eyebrow: "From deep",
      body: buildBody(game.away.abbreviation, a, "away", "cold"),
      spoilery: true,
    };
  }
  if (h <= 25) {
    return {
      eyebrow: "From deep",
      body: buildBody(game.home.abbreviation, h, "home", "cold"),
      spoilery: true,
    };
  }
  return null;
}

/** Story bullet derived from period scores: comeback / Q4 surge /
 *  wire-to-wire / margin. Mirrors HighlightsStack story logic but
 *  tuned to recap-card phrasing (always ends with a period, uses the
 *  winner-named verb framing). */
function storyBullet(game: Game): RecapBullet | null {
  const a = game.periodScores?.away ?? [];
  const h = game.periodScores?.home ?? [];
  const awayWon = game.away.score > game.home.score;
  const winner = awayWon ? game.away.abbreviation : game.home.abbreviation;

  // Overtime
  if (a.length > 4) {
    const otCount = a.length - 4;
    return {
      eyebrow: "Overtime",
      body:
        otCount === 1
          ? `${winner} took it in overtime.`
          : `${winner} took it after ${otCount} overtimes.`,
      spoilery: true,
    };
  }

  // Comeback (15+ deficit erased)
  if (a.length >= 2 && h.length >= 2) {
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
    if (awayWon && maxHomeLead >= 15) {
      return {
        eyebrow: "Comeback",
        body: `${game.away.abbreviation} erased a ${maxHomeLead}-point deficit.`,
        spoilery: true,
      };
    }
    if (!awayWon && maxAwayLead >= 15) {
      return {
        eyebrow: "Comeback",
        body: `${game.home.abbreviation} erased a ${maxAwayLead}-point deficit.`,
        spoilery: true,
      };
    }
  }

  // Q4 push
  if (a.length >= 4 && h.length >= 4) {
    const aQ4 = a[3] ?? 0;
    const hQ4 = h[3] ?? 0;
    const margin = aQ4 - hQ4;
    if (margin >= 8 && awayWon) {
      return {
        eyebrow: "Q4 push",
        body: `${game.away.abbreviation} pulled away in Q4 by ${margin}.`,
        spoilery: true,
      };
    }
    if (margin <= -8 && !awayWon) {
      return {
        eyebrow: "Q4 push",
        body: `${game.home.abbreviation} pulled away in Q4 by ${Math.abs(margin)}.`,
        spoilery: true,
      };
    }
  }

  // Margin fallbacks (calmer copy than the highlights stack, since
  // the recap card is a moment and shouldn't end on a stat dump).
  const margin = Math.abs(game.away.score - game.home.score);
  if (margin <= 3) {
    return {
      eyebrow: "One possession",
      body: `${winner} held on at the buzzer.`,
      spoilery: true,
    };
  }
  if (margin >= 20) {
    return {
      eyebrow: "Blowout",
      body: `${winner} ran away with it, ${margin}-point margin.`,
      spoilery: true,
    };
  }
  // 4–19: skip the bullet rather than say something bland.
  return null;
}

/** Match-up key for finding the next game in the same playoff series.
 *  Order-independent so AWAY+HOME flip between games doesn't break it. */
function matchupKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/** Find the next game between the same two teams later than `game`.
 *  Returns null when the series wrapped (someone WINS SERIES), or when
 *  no upcoming game is in the parsed window. */
function findNextGame(game: Game, all: Game[]): Game | null {
  // If the summary says series wrapped, there's no "next."
  if (/WINS?\s+SERIES/i.test(game.seriesSummary)) return null;

  const key = matchupKey(game.away.abbreviation, game.home.abbreviation);
  const currentTime = new Date(game.date).getTime();
  if (!isFinite(currentTime)) return null;

  const candidates = all
    .filter((g) => g.id !== game.id)
    .filter((g) => g.status === "upcoming")
    .filter(
      (g) =>
        matchupKey(g.away.abbreviation, g.home.abbreviation) === key
    )
    .map((g) => ({ g, t: new Date(g.date).getTime() }))
    .filter((x) => isFinite(x.t) && x.t > currentTime)
    .sort((a, b) => a.t - b.t);

  return candidates[0]?.g ?? null;
}

/** Build "Next: Game N · in NY · Tue 8:00 PM" from a future game. We
 *  don't always know the game number (ESPN doesn't surface it
 *  uniformly), so we degrade gracefully: with a number when present,
 *  without when not. */
function composeNextLine(game: Game, next: Game): string {
  // The home team plays "in [city/code]" — use the upcoming game's
  // home abbreviation as the venue marker.
  const venue = next.home.abbreviation;

  // Day + time. Compact, single line.
  let when = "";
  try {
    const d = new Date(next.date);
    when = d.toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    when = "";
  }

  // Try to lift "Game N" out of gameContext or seriesSummary on the
  // upcoming game; otherwise fall back to a plain "Next game."
  const ctx = `${next.gameContext ?? ""} ${next.seriesSummary ?? ""}`;
  const gn = ctx.match(/Game\s+(\d+)/i);
  const head = gn ? `Game ${gn[1]}` : "Next game";

  const venueClause = venue ? ` · in ${venue}` : "";
  const whenClause = when ? ` · ${when}` : "";
  // Game still uses the same matchup so we don't need to restate it.
  // The series block above the recap already shows the dots.
  void game;
  return `${head}${venueClause}${whenClause}.`;
}

/** Compose the NBA recap shape. Returns null when the game is not
 *  final — callers should only invoke for finals. The optional
 *  `allNBAGames` enables a "Next" line when the series continues. */
export function deriveNBARecap(
  game: Game,
  allNBAGames: Game[] = []
): NBARecap | null {
  if (game.status !== "final") return null;

  const awayWon = game.away.score > game.home.score;
  const winnerCode = awayWon ? game.away.abbreviation : game.home.abbreviation;

  // Headline. Always name the winner when we can — it's spoilery, the
  // caller will Spoiler-wrap under No-Spoilers.
  const headline = `${winnerCode} took it.`;

  // Series line via the stake deriver. The stake's `line` already
  // reads as editorial copy (e.g. "NY can close the series with one
  // more win."), so we use it as-is.
  const seriesStake = deriveNBASeriesStake(game);
  const seriesLine = seriesStake ? seriesStake.line : null;

  // Bullets: top performer + (rebounds OR threes, whichever fires) +
  // story. Max 3, never padded.
  const bullets: RecapBullet[] = [];
  const top = topPerformerBullet(game);
  if (top) bullets.push(top);

  const rebs = reboundBullet(game);
  const threes = threeBullet(game);
  // Prefer the more "extreme" of the two team stats.
  if (rebs) bullets.push(rebs);
  else if (threes) bullets.push(threes);

  if (bullets.length < 3) {
    const story = storyBullet(game);
    if (story) bullets.push(story);
  }

  // Next-game line: look across the full games list for the next
  // upcoming game between the same two teams. Skip when the series
  // wrapped or when no upcoming game is in the parsed window.
  const next = findNextGame(game, allNBAGames);
  const nextLine = next ? composeNextLine(game, next) : null;

  return {
    source: "nba",
    headline,
    headlineSpoilery: true,
    awayCode: game.away.abbreviation,
    awayScore: game.away.score,
    homeCode: game.home.abbreviation,
    homeScore: game.home.score,
    seriesLine,
    bullets: bullets.slice(0, 3),
    nextLine,
  };
}
