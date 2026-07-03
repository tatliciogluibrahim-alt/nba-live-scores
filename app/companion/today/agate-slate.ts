// Pure helpers for the System D mobile agate slate (Task 8). The lead
// Monument is index 01 and the ALSO LIVE band carries 02..0N; the slate
// sections (UP NEXT, QUIET WRAP) continue the SAME running ordinal below the
// band so the whole mobile page reads as one numbered slate (see
// docs/superpowers/design-directions/d-mix). These are string/number pure
// functions only — no React, no data fetching — so the render layer stays a
// layout and the index math + parsing are unit-testable.

import type { TodaySource } from "./today-data";

/** Zero-padded 2-digit ordinal for an agate idx ("04"). Numbers past 99
 *  (never realistic on a single day's slate) fall through un-padded. */
export function padIdx(n: number): string {
  return String(n).padStart(2, "0");
}

/** First running index for the slate below the band. The last index used
 *  above the slate is (lead ? 1 : 0) + bandShownCount, so the slate's first
 *  row is the next one. A quiet day with no lead + no band starts at 01. */
export function slateStartIndex(hasLead: boolean, bandShownCount: number): number {
  return (hasLead ? 1 : 0) + bandShownCount + 1;
}

/** Split a "AWAY vs HOME" matchup/headline into its two codes. Falls back to
 *  the whole string as the away side if there's no " vs " separator. */
export function matchupCodes(s: string): { away: string; home: string } {
  const parts = s.split(/\s+vs\s+/i).map((p) => p.trim());
  return { away: parts[0] ?? s, home: parts[1] ?? "" };
}

/** Parse a "121 – 109" score line (en-dash or hyphen, with or without
 *  spaces) into numbers. Null when the shape doesn't parse. */
export function parseScoreLine(s: string): {
  away: number | null;
  home: number | null;
} {
  const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return { away: null, home: null };
  return { away: Number(m[1]), home: Number(m[2]) };
}

/** En-dash join for an agate score cell ("121–109"), matching d-mix. */
export function agateScore(away: number | null, home: number | null): string {
  return `${away ?? 0}–${home ?? 0}`;
}

/** Sport-correct UP NEXT count noun for the SecHead ("1 MATCH", "2 GAMES").
 *  All-soccer lists read "match(es)"; anything with an NBA/NFL game (or a
 *  mixed slate) reads the generic "game(s)". Returned uppercase — SecHead
 *  renders the count verbatim. */
export function upNextCountLabel(items: { source: TodaySource }[]): string {
  const n = items.length;
  const allWc = n > 0 && items.every((i) => i.source === "wc");
  const noun = allWc ? (n === 1 ? "match" : "matches") : n === 1 ? "game" : "games";
  return `${n} ${noun}`.toUpperCase();
}

/** QUIET WRAP count label — sport-neutral wrapped noun ("2 WRAPPED"). */
export function wrapCountLabel(n: number): string {
  return `${n} WRAPPED`;
}
