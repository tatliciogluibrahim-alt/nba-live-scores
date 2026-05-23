// Companion-side helpers for NBA Live Companion. Two kinds of derivation:
//
//  1. `deriveHero` — short hero-moment headline. Has a No-Spoilers safe
//     variant that never references closeness, lead, or margin.
//  2. `deriveSeriesContext` — light context strings ("Game 4 · East Semifinals")
//     with spoiler-aware redaction of the leader/winner line.
//
// `getKeyMoments`, `humanizePlayKind`, and `humanizeNeutral` are imported
// from the existing nba/lib so we don't duplicate the curation logic.

import type { Game } from "../../nba/types";
import { getGameNumberFromText } from "../../nba/lib/moment-intelligence";

// ── Hero headline ─────────────────────────────────────────────────────

export function deriveHero(
  game: Game,
  noSpoilers: boolean
): { eyebrow: string; headline: string; live: boolean } {
  const isLive = game.status === "live";
  const isFinal = game.status === "final";
  const period = Math.max(0, game.period ?? 0);
  const statusText = (game.statusText ?? "").toUpperCase();

  if (game.status === "upcoming") {
    return {
      eyebrow: "Tips off",
      headline: "Game is upcoming.",
      live: false,
    };
  }

  if (isFinal) {
    // Under No-Spoilers we never imply who won. Without No-Spoilers, just
    // say "Final." — the score row carries the result. The hero stays calm.
    return { eyebrow: "Wrapped", headline: "Final.", live: false };
  }

  // Live — pick a calm, period-based headline. The spoilery variants
  // (one-possession, final-minutes-are-close) only apply when No-Spoilers
  // is off, because they reveal score-closeness.
  if (statusText.includes("HALF")) {
    return { eyebrow: "Halftime", headline: "Halftime.", live: true };
  }
  if (statusText.includes("END Q") || statusText.includes("END OF Q")) {
    return { eyebrow: statusText.replace("END ", "End "), headline: "Between quarters.", live: true };
  }

  if (!noSpoilers && isLive) {
    const diff = Math.abs(game.home.score - game.away.score);
    const inLate = period >= 4 || statusText.includes("OT");
    if (inLate && diff <= 3) {
      return { eyebrow: "Final 5", headline: "One-possession game.", live: true };
    }
    if (inLate && diff <= 6) {
      return { eyebrow: "Q4", headline: "Final minutes are close.", live: true };
    }
  }

  if (period >= 4) {
    return { eyebrow: "Q4", headline: "Fourth quarter underway.", live: true };
  }
  if (period === 3) {
    return { eyebrow: "Q3", headline: "Third quarter underway.", live: true };
  }
  if (period === 2) {
    return { eyebrow: "Q2", headline: "Second quarter underway.", live: true };
  }
  if (period === 1) {
    return { eyebrow: "Q1", headline: "First quarter underway.", live: true };
  }
  return { eyebrow: "Live", headline: "Game is live.", live: true };
}

// ── Series context ────────────────────────────────────────────────────

export type SeriesContext = {
  /** Always safe: "Game 4 · East Semifinals" or "" if no info. */
  safeLine: string;
  /** Spoilery: "DET leads series 2-1" — caller decides whether to render. */
  spoileryLine: string;
};

export function deriveSeriesContext(game: Game): SeriesContext {
  const round = game.seriesRound || "";
  const conf = game.seriesConference || "";
  const gameNumber = getGameNumberFromText(
    [game.gameContext, game.seriesSummary, game.seriesRound].filter(Boolean).join(" ")
  );

  // Safe descriptor: combine "Game N" with the round/conference label.
  // Tournament structure is public information; round names don't spoil.
  const roundLabel = conf && round
    ? `${conf} ${normalizeRoundName(round)}`
    : conf
      ? conf
      : normalizeRoundName(round);

  const parts: string[] = [];
  if (gameNumber) parts.push(`Game ${gameNumber}`);
  if (roundLabel) parts.push(roundLabel);
  const safeLine = parts.join(" · ");

  // Spoilery line — passes through whatever the API put in seriesSummary.
  // The caller wraps this in a Spoiler block or redacts entirely under
  // No-Spoilers via safeText().
  const spoileryLine = game.seriesSummary || "";

  return { safeLine, spoileryLine };
}

function normalizeRoundName(round: string): string {
  if (!round) return "";
  if (/finals/i.test(round) && /nba/i.test(round)) return "NBA Finals";
  if (/conf/i.test(round)) return "Conference Finals";
  if (/second\s*round|2nd/i.test(round)) return "Semifinals";
  if (/first\s*round|1st/i.test(round)) return "First Round";
  return round;
}
