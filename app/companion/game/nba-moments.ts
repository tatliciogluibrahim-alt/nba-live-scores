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
import { deriveSeriesDots as deriveCanonicalSeriesDots } from "../series/series-derive";
import type { SeriesDot } from "../series/series-data";

// ── Play label humanizer ──────────────────────────────────────────────
// The legacy `humanizePlayKind` (in nba/lib/moment-intelligence.ts) returns
// the raw `kind` verbatim for anything it doesn't recognize — which lets
// ESPN strings like "OUT OF BOUNDS - BAD PASS TURNOVER" or
// "DEFENSIVE REBOUND" leak into the UI. This companion-side wrapper adds
// a substring fallback so the Every-Play view stays calm.

export function humanizePlayLabel(kind: string): string {
  switch (kind) {
    case "3PT": return "Made 3";
    case "2PT": return "Made shot";
    case "FT": return "Free throw";
    case "DUNK": return "Dunk";
    case "STEAL": return "Steal";
    case "BLOCK": return "Block";
    case "AST": return "Assist";
    case "FOUL": return "Foul";
    case "TIMEOUT": return "Timeout";
    case "PLAY": return "Play";
  }

  const lower = kind.toLowerCase();
  if (lower.includes("rebound")) return "Rebound";
  if (lower.includes("turnover")) return "Turnover";
  if (lower.includes("foul")) return "Foul";
  if (lower.includes("violation")) return "Violation";
  if (lower.includes("substitution") || lower.includes("substitute"))
    return "Substitution";
  if (lower.includes("jump ball")) return "Jump ball";
  if (lower.includes("end of period") || lower.includes("end period"))
    return "End of period";
  if (lower.includes("ejection")) return "Ejection";
  if (lower.includes("timeout")) return "Timeout";
  if (lower.includes("free throw")) return "Free throw";

  // Final fallback — title-case the first word so we never leak the raw
  // uppercase ESPN classification.
  const firstWord = kind.split(/[\s-]/)[0]?.toLowerCase();
  if (!firstWord) return "Play";
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

// ── Hero headline ─────────────────────────────────────────────────────

export function deriveHero(
  game: Game,
  noSpoilers: boolean
): { eyebrow: string; headline: string; context?: string; live: boolean } {
  const isLive = game.status === "live";
  const isFinal = game.status === "final";
  const period = Math.max(0, game.period ?? 0);
  const statusText = (game.statusText ?? "").toUpperCase();

  if (game.status === "upcoming") {
    const gameNumber = getGameNumberFromText(
      [game.gameContext, game.seriesSummary, game.seriesRound]
        .filter(Boolean)
        .join(" ")
    );

    // Format tipoff time — "tonight at 7:30 PM" when same local date,
    // "Sat, Jun 7 at 7:30 PM" otherwise.
    let tipoff = "";
    try {
      const d = new Date(game.date);
      const todayStr = new Date().toDateString();
      const gameStr = d.toDateString();
      const timeStr = d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      tipoff = gameStr === todayStr ? `tonight at ${timeStr}` : d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      tipoff = "tonight";
    }

    // Headline — prefer "Game N tips off [time]." when we have a game
    // number (playoff series); fall back to generic for regular-season games.
    const headline = gameNumber
      ? `Game ${gameNumber} tips off ${tipoff}.`
      : `Tips off ${tipoff}.`;

    // No context line here: the spoilery series summary now lives in the
    // canonical Series block under the scoreboard, and the broadcast is
    // already in WatchLine. Repeating either of them inside the Preview
    // hero turned the page into an admin stack of duplicated facts.
    return { eyebrow: "Preview", headline, live: false };
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
  // Guard against duplication like "Finals NBA Finals" (conf="Finals" +
  // round="NBA Finals"): when the normalized round name already contains
  // the conference word, the round name is complete on its own. Keeps
  // legitimate pairs like "East · Semifinals" intact.
  const roundLabel = (() => {
    const normalized = normalizeRoundName(round);
    if (!conf) return normalized;
    if (!normalized) return conf;
    if (normalized.toLowerCase().includes(conf.toLowerCase())) return normalized;
    return `${conf} ${normalized}`;
  })();

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

export function deriveSeriesDots(
  game: Game,
  allGames: ReadonlyArray<Game> = []
): SeriesDot[] {
  return deriveCanonicalSeriesDots({ currentGame: game, allGames });
}

function normalizeRoundName(round: string): string {
  if (!round) return "";
  if (/finals/i.test(round) && /nba/i.test(round)) return "NBA Finals";
  if (/conf/i.test(round)) return "Conference Finals";
  if (/second\s*round|2nd/i.test(round)) return "Semifinals";
  if (/first\s*round|1st/i.test(round)) return "First Round";
  return round;
}
