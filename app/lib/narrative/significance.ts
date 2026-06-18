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
  if (facts.sport === "wc") return rankSignalsWC(facts);

  const signals: Signal[] = [];

  // Series stakes dominate when present. `seriesUrgent` reflects the
  // PRE-game state (one team facing elimination, Game 7, etc.) and flips
  // off the moment a series ends — so a finished clinching game would
  // otherwise rank "routine". We also read the post-game seriesLine text
  // for closure phrases ("wins/won the series", "took the series",
  // "advance to", "eliminated", "series wrapped") and treat that as a
  // clinch regardless of the urgency flag.
  const seriesLine = facts.seriesLine ?? "";
  const seriesClosed =
    /\b(won|wins|win)\s+the\s+series\b/i.test(seriesLine) ||
    /\btook\s+the\s+series\b/i.test(seriesLine) ||
    /\badvanc(e|es|ed|ing)\b/i.test(seriesLine) ||
    /\beliminat(e|es|ed|ing)\b/i.test(seriesLine) ||
    /\bseries\s+(over|wrapped|complete)\b/i.test(seriesLine) ||
    /\bsweep\b/i.test(seriesLine);

  if (facts.seriesUrgent && /\bgame\s*7\b/i.test(seriesLine)) {
    signals.push({ kind: "game7", weight: 100, note: "Game 7 result" });
  } else if (facts.seriesUrgent || seriesClosed) {
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

// Soccer significance. A final box gives us the score, the scorers, the
// stage, and the resulting stake (group standing / advancement). No
// in-game lead memory, so a "comeback" can't be detected from the box;
// we surface the angles a result line honestly supports.
function rankSignalsWC(facts: GameFacts): Signal[] {
  const signals: Signal[] = [];
  const a = facts.away.score ?? 0;
  const h = facts.home.score ?? 0;
  const total = a + h;
  const margin = facts.margin ?? Math.abs(a - h);
  const draw = a === h;

  // Advancement / elimination stakes lead when the stake line carries them.
  const stake = facts.stakeLine ?? "";
  if (/\b(through|advance|advances|advanced|qualif)/i.test(stake)) {
    signals.push({ kind: "decider", weight: 95, note: "advancement" });
  } else if (/\b(out|eliminat)/i.test(stake)) {
    signals.push({ kind: "decider", weight: 90, note: "elimination" });
  }

  // Individual scoring nights.
  const topScorer = facts.scorers?.[0];
  if (topScorer && topScorer.goals >= 3) {
    signals.push({
      kind: "hat-trick",
      weight: 85,
      note: `${topScorer.name} ${topScorer.goals} goals`,
    });
  } else if (topScorer && topScorer.goals === 2) {
    signals.push({
      kind: "brace",
      weight: 55,
      note: `${topScorer.name} brace`,
    });
  }

  // Shape of the result.
  if (draw && total === 0) {
    signals.push({ kind: "stalemate", weight: 40, note: "goalless draw" });
  } else if (draw) {
    signals.push({ kind: "comeback-draw", weight: 50, note: `${a}-${h} draw` });
  } else if (total >= 5) {
    signals.push({ kind: "goal-fest", weight: 60, note: `${total} goals` });
  } else if (!draw && margin >= 2 && Math.min(a, h) === 0) {
    signals.push({ kind: "shutout", weight: 45, note: `clean sheet, won by ${margin}` });
  } else if (margin === 1) {
    signals.push({ kind: "tight-win", weight: 50, note: "one-goal game" });
  }

  if (signals.length === 0) {
    signals.push({ kind: "routine", weight: 10, note: "final" });
  }

  return signals.sort((a, b) => b.weight - a.weight);
}
