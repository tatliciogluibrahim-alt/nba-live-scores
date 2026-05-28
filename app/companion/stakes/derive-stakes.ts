// Stake derivation. Rules-based, no probabilities, no predictions —
// just plain-English context for "why this game/series/group matters."
//
// One pure function per sport-shape. Each returns a `Stake` (a short
// sentence + spoilery flag) or null when there's nothing useful to
// say. The mounting component (`StakesLine`) handles Spoiler
// wrapping when noSpoilers is on.
//
// Cross-sport ready: NBA series + WC group land here in Phase A. NFL
// season-state and Champions League knockout shapes slot in as
// additional derivers without changing the caller contract.

import type { Game } from "../../nba/types";
import type { CountryEntry } from "../following/data/countries";
import { deriveSeriesStake } from "./series-stakes";

export type Stake = {
  /** Short caps eyebrow rendered above (or inline with) the line.
   *  Keep these single-word when possible: "STAKES", "PATH". */
  eyebrow: string;
  /** One sentence in editorial voice. Already terminates with a period. */
  line: string;
  /** True when the line reveals current series/standings state. The
   *  caller wraps with `<Spoiler>` when the user has No-Spoilers on. */
  spoilery: boolean;
};

// ── NBA series ─────────────────────────────────────────────────────────
//
// Delegates to the shared `deriveSeriesStake` (app/companion/stakes/
// series-stakes.ts) so the in-app StakesLine and the Brief email always
// speak the same team-named, round-aware language. We only wrap it in
// the `Stake` shape (eyebrow + spoilery) the StakesLine expects, and
// keep the structural fallback for unknown summaries.

export function deriveNBASeriesStake(game: Game | null): Stake | null {
  if (!game) return null;

  const stake = deriveSeriesStake(game);
  if (stake) {
    return { eyebrow: "Stakes", line: stake.line, spoilery: true };
  }

  // No parseable series state. Only offer the structural fact when the
  // game actually carries a series summary (otherwise stay silent).
  if (!game.seriesSummary) return null;
  return {
    eyebrow: "Format",
    line: "Best-of-seven series. First to four wins.",
    spoilery: false,
  };
}

// ── WC group (pre-tournament) ──────────────────────────────────────────
//
// Pre-kickoff, the only honest stake is structural: group is set,
// top two control their own path, third can advance via best-third.
// Once standings exist (mid-tournament), we'll add a separate
// deriver that reads goal difference / head-to-head. That ships
// after the WC standings feed lands; for now we return the
// pre-tournament line unconditionally.

export function deriveWCGroupStake(
  country: CountryEntry,
  tournamentStarted: boolean
): Stake | null {
  if (!tournamentStarted) {
    return {
      eyebrow: "Path",
      line: `Top two in Group ${country.group} advance to the Round of 32. Best four third-place finishers also move on.`,
      spoilery: false,
    };
  }
  // Tournament started: until we have live standings, stay quiet.
  // Returning null keeps the StakesLine from rendering rather than
  // surfacing a generic placeholder that misreads as a real take.
  return null;
}
