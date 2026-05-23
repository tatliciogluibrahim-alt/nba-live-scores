// Shared text-safety helpers for No-Spoilers mode.
// Use sparingly — prefer wrapping scores in <Spoiler>. These helpers exist
// for *secondary* text that mentions series state, winners, margins, or
// advancement (e.g. "DET leads series 2-1", "Knicks beat Celtics").
//
// The intent is to redact spoilery prose, not to censor every basketball
// term. Tournament structure ("East Semifinals", "Game 4", "Round of 32")
// is NOT redacted — those don't reveal a result.

const SPOILERY_RE =
  /\b(wins?\s+series|leads?\s+series|series\s+tied|leads?\b|trails?|advance|advanced|advances|clinch|clinched|beat|beats|defeated|won|wins|up\s+\d|by\s+\d|one[\s-]possession)\b/i;

/** Returns the line as-is when safe, or an empty string when it contains
 *  spoilery language and No-Spoilers is on. */
export function safeText(line: string, noSpoilers: boolean): string {
  if (!noSpoilers) return line;
  if (!line) return line;
  return SPOILERY_RE.test(line) ? "" : line;
}

/** True when the line contains language we treat as a spoiler. */
export function isSpoilery(line: string): boolean {
  return Boolean(line) && SPOILERY_RE.test(line);
}
