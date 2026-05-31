import type { GameFacts, NarrativeMode } from "./types";
import { rankSignals } from "./significance";
import { generateValidated } from "./generate";
import { readCachedNarrative, writeCachedNarrative } from "./cache";

// Cache-first narrative service. Generates a validated line at most once
// per game (60d cache), retries once on validation failure, and always
// degrades to text=null (→ template) on any miss. Does NOT render to any
// user surface; the caller decides what to do with the result. This is
// what the shadow pass and the admin preview both call.

export type NarrativeOutcome = {
  text: string | null;
  source: "cache" | "fresh" | "none";
  topSignal: string | null;
  attempts: number;
  reasons: string[];
};

export async function getOrGenerateNarrative(
  facts: GameFacts,
  mode: NarrativeMode,
  opts: { skipCache?: boolean } = {}
): Promise<NarrativeOutcome> {
  const signals = rankSignals(facts);
  const topSignal = signals[0]?.kind ?? null;

  if (!opts.skipCache) {
    const cached = await readCachedNarrative(facts.gameId);
    if (cached) {
      return {
        text: cached.text,
        source: "cache",
        topSignal,
        attempts: 0,
        reasons: [],
      };
    }
  }

  if (mode === "off") {
    return { text: null, source: "none", topSignal, attempts: 0, reasons: ["off"] };
  }

  const result = await generateValidated(facts, signals, mode);
  if (result.text) {
    await writeCachedNarrative(facts.gameId, {
      text: result.text,
      createdAt: Date.now(),
      signal: topSignal ?? "routine",
    });
    return {
      text: result.text,
      source: "fresh",
      topSignal,
      attempts: result.attempts,
      reasons: [],
    };
  }

  return {
    text: null,
    source: "none",
    topSignal,
    attempts: result.attempts,
    reasons: result.lastReasons,
  };
}
