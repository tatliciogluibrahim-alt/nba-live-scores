// Feed ports — Stage 15G.
//
// Type-level inversion layer between the companion's adapters
// (today-data, watching-data, series-data, country-data) and the
// raw API responses. The companion currently couples to two concrete
// shapes — `NBAGame` from `app/companion/today/today-data.ts` and
// `WCGameLite` from the same module — both of which mirror the live
// API responses.
//
// These ports describe the *minimum* shape an adapter needs so a
// future feed (a different NBA provider, a different soccer source,
// a mocked feed for tests) can be swapped in without touching adapter
// code. No runtime behavior is added; this file is pure types.
//
// To migrate, change a consumer's import from `today-data` to
// `lib/feed-ports`. The existing types satisfy these interfaces
// structurally, so no shape change is required at the call sites
// until a real second feed lands.

/** Universal team identity inside any game shape. */
export type FeedTeam = {
  /** Three-letter code or country code: "NYK", "BIH", "ARG". */
  abbreviation: string;
  /** Human-readable name: "Knicks", "Argentina". */
  name: string;
  /** Numeric score. Zero is meaningful (0–0 tie); use `null` for
   *  upcoming games where score doesn't exist yet. */
  score: number;
};

/** Game lifecycle. Matches the lifecycle the existing adapters expect. */
export type FeedGameStatus = "live" | "upcoming" | "final";

/** Minimum required fields for any sport feed to feed a Today/Watching
 *  surface. Both NBAGame and WCGameLite already satisfy this. */
export type FeedGame = {
  id: string;
  /** ISO datetime string. */
  date: string;
  status: FeedGameStatus;
  /** Short human label for the current state. "LIVE", "Q3 0:09", "Final". */
  statusText: string;
  home: FeedTeam;
  away: FeedTeam;
  /** Broadcast channels in user's region. Empty array if unknown. */
  broadcasts: string[];
};

// ── Sport-specific port extensions ────────────────────────────────────

/** NBA additions on top of the universal FeedGame. */
export type NBAFeedGame = FeedGame & {
  period: number;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
};

/** World Cup additions on top of the universal FeedGame. */
export type WCFeedGame = FeedGame & {
  stage: string;
  group: string;
  watchLabel: string;
};

// ── Adapter port (consumer-facing) ────────────────────────────────────

/** A feed source — what the companion reads from. The current
 *  implementation is "fetch from /api/live-scores or /api/world-cup",
 *  but any source returning these shapes is acceptable.
 *
 *  Why function-shaped rather than object-shaped: keeps the call site
 *  identical to the current `await fetchNBA()` pattern. */
export type NBAFeedSource = () => Promise<NBAFeedGame[]>;
export type WCFeedSource = () => Promise<WCFeedGame[]>;
