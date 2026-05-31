import type { GameFacts, NarrativeMode, Signal } from "./types";
import { narrate } from "./render";
import { validateNarrative } from "./validate";

// Generate-then-validate with a single retry. Pure orchestration over
// render + validate, no KV, never throws.
//
// Retry policy: a *validation* failure (the model wrote something
// off-voice or ungrounded) is worth one more roll of the dice. A null
// from narrate() is a config-level miss (pilot off / no API key) and
// won't change on retry, so we bail immediately. Either way the final
// text=null means "fall back to the deterministic template," so a bad
// generation can never reach a user.

export type NarrativeResult = {
  text: string | null;
  attempts: number;
  /** Reasons the last attempt was rejected (empty when text is set). */
  lastReasons: string[];
};

export async function generateValidated(
  facts: GameFacts,
  signals: Signal[],
  mode: NarrativeMode,
  maxAttempts = 2
): Promise<NarrativeResult> {
  let lastReasons: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const text = await narrate(facts, signals, mode);
    if (!text) {
      return {
        text: null,
        attempts: attempt,
        lastReasons: ["no-generation"],
      };
    }

    const verdict = validateNarrative(text, facts);
    if (verdict.ok) {
      return { text, attempts: attempt, lastReasons: [] };
    }
    lastReasons = verdict.reasons;
  }

  return { text: null, attempts: maxAttempts, lastReasons };
}
