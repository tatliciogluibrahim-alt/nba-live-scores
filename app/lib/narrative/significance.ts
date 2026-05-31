import type { GameFacts, Signal } from "./types";

// Significance ranking — the "what is worth noticing" brain. Pure,
// hand-tuned, no model. Returns signals ordered most-significant first.
// The renderer leans on the top signal to decide what the sentence
// leads with. Thresholds are deliberately simple and tunable; calibrate
// them later against a manual read of real recaps (the §6 research
// spike), not by adding statistical machinery now.
//
// MVP scope: finals only. Live/upcoming narrative is a later step, and a
// final box score alone can't tell us about in-game comebacks (no
// max-lead memory here), so those signals are intentionally absent.

export function rankSignals(facts: GameFacts): Signal[] {
  if (facts.status !== "final") return [];

  const signals: Signal[] = [];

  // Series stakes dominate when present and urgent.
  if (facts.seriesUrgent && /\bgame\s*7\b/i.test(facts.seriesLine ?? "")) {
    signals.push({ kind: "game7", weight: 100, note: "Game 7 result" });
  } else if (facts.seriesUrgent) {
    signals.push({ kind: "clinch", weight: 90, note: "series-deciding result" });
  }

  // Standout individual night.
  const p = facts.topPerformer;
  if (p) {
    if (p.pts >= 40) {
      signals.push({
        kind: "career-night",
        weight: 70,
        note: `${p.name} ${p.pts} PTS`,
      });
    } else if (p.pts >= 30) {
      signals.push({
        kind: "career-night",
        weight: 50,
        note: `${p.name} ${p.pts} PTS`,
      });
    }
  }

  // Game shape from the final margin.
  if (facts.margin != null) {
    if (facts.margin <= 4) {
      signals.push({ kind: "nail-biter", weight: 60, note: `won by ${facts.margin}` });
    } else if (facts.margin >= 20) {
      signals.push({ kind: "blowout", weight: 30, note: `won by ${facts.margin}` });
    }
  }

  if (signals.length === 0) {
    signals.push({ kind: "routine", weight: 10, note: "final" });
  }

  return signals.sort((a, b) => b.weight - a.weight);
}
