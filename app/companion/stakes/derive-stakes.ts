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
// Inputs: a representative game in the series (any status) with the
// canonical seriesSummary text from ESPN. We parse the summary for
// state — "WINS SERIES" / "LEADS SERIES n-m" / "TIED n-n" — and emit
// the corresponding plain-English stake.
//
// Spoiler model: "X leads 3-1" is spoilery. "Best-of-7" is structural.

const SERIES_WINS_RE = /(\w+)\s+WINS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i;
const SERIES_LEADS_RE = /(\w+)\s+LEADS\s+SERIES\s+(\d+)\s*-\s*(\d+)/i;
const SERIES_TIED_RE = /SERIES\s+TIED\s+(\d+)\s*-\s*(\d+)/i;

export function deriveNBASeriesStake(game: Game | null): Stake | null {
  if (!game) return null;
  const summary = game.seriesSummary ?? "";
  if (!summary) return null;

  // Series wrapped — the winner advances.
  const wins = summary.match(SERIES_WINS_RE);
  if (wins) {
    const winner = wins[1];
    return {
      eyebrow: "Stakes",
      line: `${winner} took the series. They advance.`,
      spoilery: true,
    };
  }

  // Mid-series leader.
  const leads = summary.match(SERIES_LEADS_RE);
  if (leads) {
    const leader = leads[1];
    const w = Number(leads[2]);
    const l = Number(leads[3]);
    const games = w + l;

    // 3-0 lead — one win from a sweep.
    if (w === 3 && l === 0) {
      return {
        eyebrow: "Stakes",
        line: `${leader} can sweep the series with one more win.`,
        spoilery: true,
      };
    }
    // 3-1 lead — same closeout language without the sweep word.
    if (w === 3 && l === 1) {
      return {
        eyebrow: "Stakes",
        line: `${leader} can close the series with one more win.`,
        spoilery: true,
      };
    }
    // 3-2 lead — facing elimination on the road.
    if (w === 3 && l === 2) {
      return {
        eyebrow: "Stakes",
        line: `${leader} can close it next game. The trailing side faces elimination.`,
        spoilery: true,
      };
    }
    // 2-1 or 1-0 leads early in the series.
    if (games <= 3) {
      return {
        eyebrow: "Stakes",
        line: `${leader} holds early control. Plenty of series left.`,
        spoilery: true,
      };
    }
    // 2-2 isn't a "leads" pattern but defensive default.
    return {
      eyebrow: "Stakes",
      line: `${leader} leads ${w}-${l} in a best-of-seven.`,
      spoilery: true,
    };
  }

  // Series tied — middle-game pivot.
  const tied = summary.match(SERIES_TIED_RE);
  if (tied) {
    const each = Number(tied[1]);
    if (each === 3) {
      return {
        eyebrow: "Stakes",
        line: "Game 7. Winner takes the series.",
        spoilery: true,
      };
    }
    if (each === 2) {
      return {
        eyebrow: "Stakes",
        line: "Best-of-three from here. The next game decides the pivot.",
        spoilery: true,
      };
    }
    if (each === 1) {
      return {
        eyebrow: "Stakes",
        line: "Series even early. Each game tilts the next.",
        spoilery: true,
      };
    }
    return {
      eyebrow: "Stakes",
      line: `Series tied ${each}-${each}.`,
      spoilery: true,
    };
  }

  // Unknown summary shape — fall back to structural fact (not spoilery).
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
