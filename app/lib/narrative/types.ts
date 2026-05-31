// Narrative intelligence — shared types.
//
// This module is the "brain output" boundary. Everything here is plain
// data: no React, no KV, no ESPN/Game imports. The sport-specific
// adapter (app/lib/brief/narrative-facts.ts) assembles a GameFacts from
// the live feed; this package reasons over it and renders it. Keeping
// the core dependency-free is what makes it extractable into a
// standalone service later (see docs/NARRATIVE_INTELLIGENCE_ANALYSIS.md).

export type NarrativeMode = "off" | "shadow" | "live";

export type TeamFacts = {
  code: string;
  name: string;
  score: number | null;
};

export type PerformerFacts = {
  name: string;
  team: string;
  pts: number;
  ast: number;
  reb: number;
};

/** The validated fact object handed to the renderer. Every number that
 *  may legitimately appear in generated text is collected in
 *  `groundedNumbers` — the validator rejects any number not in that set,
 *  which is how we enforce zero-hallucination on figures. */
export type GameFacts = {
  gameId: string;
  sport: "nba";
  status: "live" | "upcoming" | "final";
  away: TeamFacts;
  home: TeamFacts;
  /** Final only. */
  winnerCode: string | null;
  loserCode: string | null;
  /** Absolute final margin, final only. */
  margin: number | null;
  /** From deriveSeriesStake — the calm "what this unlocks" sentence. */
  seriesLine: string | null;
  seriesUrgent: boolean;
  topPerformer: PerformerFacts | null;
  groundedNumbers: number[];
};

export type SignalKind =
  | "game7"
  | "clinch"
  | "career-night"
  | "nail-biter"
  | "blowout"
  | "routine";

export type Signal = {
  kind: SignalKind;
  /** Higher = more significant. Used only to rank, not shown to users. */
  weight: number;
  /** Short internal note (for the shadow log + the renderer hint). */
  note: string;
};
