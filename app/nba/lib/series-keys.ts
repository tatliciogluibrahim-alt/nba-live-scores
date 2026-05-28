// Shared NBA series-key helpers. Previously these pure functions were
// copy-pasted across TournamentClient, TeamClient, SeriesPicker, and
// use-wrapped-series (buildSeriesKey 4×, isSeriesCandidate 2×) while
// isPlaceholderAbbr / buildWinnerOverrides lived only in TournamentClient
// even though the team + picker surfaces hit the same placeholder cases.
// Centralizing them keeps the series-routing logic defined once.

/** Minimal game shape these helpers read. A structural subset of both
 *  the /api/live-scores NBAGame and the nba/types Game, so every caller
 *  can pass whatever it already has. */
export type SeriesKeyGame = {
  away: { abbreviation: string };
  home: { abbreviation: string };
  seriesSummary?: string;
  seriesConference?: string;
  seriesRound?: string;
  gameContext?: string;
};

/** Canonical series id: the two abbreviations, alphabetized, joined with
 *  a hyphen. So "NYK vs CLE" and "CLE vs NYK" both key to "CLE-NYK".
 *  Always pass abbreviations that have been through the canonical-alias
 *  layer (the /api/live-scores route applies NY → NYK before returning). */
export function buildSeriesKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

/** ESPN uses compound strings like "SPURS/THUNDER" for placeholder games
 *  where one side is "winner of an upcoming series." Treat anything with
 *  a slash as a placeholder, plus the obvious "TBD" / empty cases. */
export function isPlaceholderAbbr(code: string): boolean {
  if (!code) return true;
  if (code === "TBD") return true;
  if (code.includes("/")) return true;
  return false;
}

/** True when a game has both team abbreviations AND carries enough
 *  playoff-series context (round / conference / summary / "Game N"
 *  headline) to be treated as a series.
 *
 *  Placeholder policy is deliberately NOT baked in here, because the
 *  two callers want different things:
 *    • SeriesPicker rejects ALL placeholders (you can't follow a
 *      not-yet-decided matchup — it'd persist a dead follow id).
 *    • TournamentClient ALLOWS one placeholder side so a forward-
 *      projected Finals row ("NYK vs TBD") still renders, then routes
 *      to the "waiting on the other side" series page.
 *  Each caller layers its own isPlaceholderAbbr check on top. */
export function hasSeriesContext(g: SeriesKeyGame): boolean {
  if (!g.away.abbreviation || !g.home.abbreviation) return false;
  return Boolean(
    g.seriesRound ||
      g.seriesConference ||
      g.seriesSummary ||
      /playoff|series|first round|second round|conf|nba finals|game\s*[1-7]/i.test(
        g.gameContext ?? ""
      )
  );
}

/** Build a map of `loserAbbr → winnerAbbr` from every wrapped series in
 *  the data set. Lets callers repair forward-projected rows where ESPN
 *  still lists an eliminated team (the NYK-in-Finals bug): cross-
 *  reference the wrapped-series winner and substitute. */
export function buildWinnerOverrides(games: SeriesKeyGame[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of games) {
    const m = g.seriesSummary?.match(/([A-Z]{2,4})\s+WINS?\s+SERIES/i);
    if (!m) continue;
    const winner = m[1].toUpperCase();
    const loser =
      winner === g.away.abbreviation
        ? g.home.abbreviation
        : winner === g.home.abbreviation
          ? g.away.abbreviation
          : null;
    if (loser && !isPlaceholderAbbr(loser)) {
      out.set(loser, winner);
    }
  }
  return out;
}
