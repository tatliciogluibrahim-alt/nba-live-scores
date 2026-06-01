// Editorial context snippets — the calm commentary layer.
//
// Curated, hand-written, factual one-liners that contextualize a big
// moment ("NYK's first Finals since 1999"). Deliberately NOT generated
// or scraped: the set of moments that actually deserve commentary is
// small (Finals, Conference Finals, Game 7s, championship runs — a
// handful per year per sport), and every line must pass the brand
// voice filter. Curating by hand keeps it accurate and on-voice with
// zero hallucination risk.
//
// Surfaces (per docs/PRINCIPLES_ALERTS_AND_INSIGHTS.md):
//   • Brief (daily email) — one italic line under the recap.
//   • Game detail (Watching) — appended to the Stakes line, pre/post game.
// NOT in lock-screen pushes — those stay short and factual.
//
// Voice rules:
//   • Facts only, no opinion. "NYK's first Finals since 1999." ✓
//     "NYK is back where they belong." ✗
//   • One snippet per moment, two max. Never a paragraph.
//   • No em-dashes (locked product rule). No FOMO.
//
// Keying: a snippet set is keyed by a stable id. Series keys use the
// SORTED team-pair shape the rest of the app uses (`series/SA-NYK`,
// alphabetical), team keys use `team/<abbr>`, tournament keys use
// `tournament/<id>`. The accessor below normalizes series lookups so
// callers can pass either order.

export type ContextSnippetSet = {
  /** ISO date the snippets were authored / are accurate as of. Lets us
   *  spot stale entries during the next big moment. */
  asOf: string;
  /** 1-2 factual one-liners. Rendered verbatim. */
  snippets: string[];
};

// Sorted team-pair key, matching the app's series id convention.
function seriesKey(a: string, b: string): string {
  return `series/${[a, b].sort().join("-")}`;
}

const SNIPPETS: Record<string, ContextSnippetSet> = {
  // ── 2026 NBA Finals: San Antonio vs New York ──────────────────────
  // Authored 2026-05-31, the morning after SA closed out OKC in Game 7.
  // NOTE: verify these dates against the real bracket before the Brief
  // sends — they are the founder's call, not a scraped fact.
  [seriesKey("SA", "NYK")]: {
    asOf: "2026-05-31",
    snippets: [
      "NYK's first Finals appearance since 1999.",
      "SA's first Finals since 2014.",
    ],
  },
  "team/NYK": {
    asOf: "2026-05-31",
    snippets: ["First Finals run since 1999."],
  },
  "team/SA": {
    asOf: "2026-05-31",
    snippets: ["Back in the Finals for the first time since 2014."],
  },
};

/** Look up the snippet set for a series by team codes (any order).
 *  Returns null when no curated entry exists — most games don't get
 *  commentary, and that's the point. */
export function getSeriesSnippets(
  teamA: string,
  teamB: string
): ContextSnippetSet | null {
  return SNIPPETS[seriesKey(teamA, teamB)] ?? null;
}

/** Look up the snippet set for a single team. */
export function getTeamSnippets(teamCode: string): ContextSnippetSet | null {
  return SNIPPETS[`team/${teamCode}`] ?? null;
}

/** Look up by an explicit pre-built key (`series/A-B`, `team/X`,
 *  `tournament/id`). Series keys must already be sorted. */
export function getSnippetsByKey(key: string): ContextSnippetSet | null {
  return SNIPPETS[key] ?? null;
}

/** First snippet for a series, or null. Convenience for single-line
 *  surfaces (the Stakes line appends just one). */
export function getPrimarySeriesSnippet(
  teamA: string,
  teamB: string
): string | null {
  return getSeriesSnippets(teamA, teamB)?.snippets[0] ?? null;
}

/** All of a series' snippets joined into one balanced line. The curated
 *  sets carry one fact per team ("NYK's first Finals since 1999. SA's
 *  first since 2014."), so rendering only the first reads as taking a
 *  side. Surfaces with room (game detail) use the full, even-handed
 *  line. Returns null when there's no curated set. */
export function getSeriesSnippetLine(
  teamA: string,
  teamB: string
): string | null {
  const set = getSeriesSnippets(teamA, teamB);
  if (!set || set.snippets.length === 0) return null;
  return set.snippets.join(" ");
}
