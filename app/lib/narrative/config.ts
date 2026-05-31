import type { NarrativeMode } from "./types";

// Pilot mode switch. Default OFF — nothing generates, no LLM call, no
// cost, until the operator opts in. This is the "secret background
// pilot" lever (see docs/NARRATIVE_INTELLIGENCE_ANALYSIS.md §9).
//
//   off    — no generation at all (default).
//   shadow — generate + validate + log candidates next to the template
//            output, but show users nothing. Safe quiet evaluation.
//   live   — reserved. The render path is not yet wired to replace the
//            hand-authored Brief lede; until it is, `live` behaves like
//            `shadow` and logs a note. Flip to a real cutover only after
//            the shadow log reads consistently well.
//
// Set NARRATIVE_PILOT=shadow in the environment (plus ANTHROPIC_API_KEY)
// to begin the pilot.
export function narrativeMode(): NarrativeMode {
  const raw = (process.env.NARRATIVE_PILOT ?? "").trim().toLowerCase();
  if (raw === "shadow") return "shadow";
  if (raw === "live") return "live";
  return "off";
}
