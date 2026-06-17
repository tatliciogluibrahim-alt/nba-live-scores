// Shared text-safety helpers for No-Spoilers mode.
//
// Use sparingly — prefer wrapping numeric scores in <Spoiler>. These helpers
// exist for *secondary* text that mentions outcome, series state, group
// advancement, knockout qualification, or margin language.
//
// What we intentionally do NOT redact:
//   • Tournament structure: "East Semifinals", "Game 4", "Round of 32",
//     "Group G", "Quarterfinals". Structure is public, scheduled info.
//   • Status labels: "Live", "Final", "Upcoming", "Halftime".
//   • Scheduled times, dates, kickoff locations.
//   • Team / country names by themselves.
//
// What we DO redact (whole line, when matched):
//   NBA — series state, lead, margin, late-game closeness phrases.
//   Summer Soccer — group/knockout advancement, elimination, "through to",
//   "qualified", "won group", "finished first/second/third", "beat",
//   "defeated", "lost to".

const PATTERNS: RegExp[] = [
  // ── NBA series state ───────────────────────────────────────────
  /wins?\s+series/i,
  /leads?\s+series/i,
  /trails?\s+(in\s+)?(the\s+)?series/i,
  /series\s+tied/i,
  /clinch(ed|es|ing)?/i,
  /\bup\s+\d/i,
  /\bby\s+\d/i,
  /one[\s-]possession/i,
  /final\s+minutes\s+are\s+close/i,

  // ── General leader / trail language ────────────────────────────
  /\bleads?\b/i,
  /\btrails?\b/i,
  /\bahead\b/i,

  // ── Win / loss / margin verbs ──────────────────────────────────
  /\bbeat(s)?\b/i,
  /\bdefeat(ed|s)?\b/i,
  /\b(won|wins)\b/i,
  /\b(lost|loses?)\b/i,

  // ── Advancement / knockout progression (Summer Soccer + NBA Finals) ─
  /\badvanc(e|ed|es|ing)\b/i,
  /\bwinner\b/i,
  /eliminated/i,
  /knocked\s+out/i,
  /through\s+to/i,
  /qualif(y|ied|ies|ying)/i,
  /won\s+(the\s+)?group/i,
  /wins?\s+(the\s+)?group/i,
  /winning\s+(the\s+)?group/i,

  // ── Past-tense finish placements only — never the infinitive ───
  // We deliberately do NOT match plain "finish" because it appears in
  // safe scenario copy like "if they finish first".
  /finished\s+(first|second|third|fourth|last)/i,
  /finishes\s+(first|second|third|fourth|last)/i,
];

// Pre-combine for cheaper matching on hot paths.
const COMBINED_RE = new RegExp(
  `(?:${PATTERNS.map((p) => p.source).join("|")})`,
  "i"
);

/** True when the line contains language we treat as a spoiler. */
export function isSpoilery(line: string): boolean {
  return Boolean(line) && COMBINED_RE.test(line);
}

/** Returns the line as-is when safe, or an empty string when it contains
 *  spoilery language and No-Spoilers is on. */
export function safeText(line: string, noSpoilers: boolean): string {
  if (!noSpoilers) return line;
  if (!line) return line;
  return isSpoilery(line) ? "" : line;
}

// ── Standard "context hidden" captions ────────────────────────────────
// Single source of truth so every surface speaks with the same calm tone.
// Always sentence-final period. Always lowercase "hidden".

export const HIDDEN_CAPTIONS = {
  series: "Series context hidden.",
  path: "Path context hidden.",
  moments: "Moments hidden.",
  schedule: "Schedule context hidden.",
} as const;
