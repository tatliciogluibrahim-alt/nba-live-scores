// NFL per-play detector (Phase 22 gate 4) — the fantasy vector. Reads the
// game summary's scoring plays (TDs / FGs / safeties / 2pt) and the current
// drive's plays (≥40yd big plays / turnovers), emits one push per NEW play.
// Pure — the caller fetches the summary (like nba-highlight-detector fetches
// game detail) and persists the fired-id set. Shapes verified against a real
// 2026-07-20 capture (docs/reference/nfl-espn-feed-capture-2026-07-20.md).

import type { PushEvent } from "./event-detector";
import { scoreEvent } from "./significance";

const BIG_PLAY_YARDS = 40;

export type NFLScoringPlay = {
  id: string;
  type?: { abbreviation?: string; text?: string };
  scoringType?: { name?: string };
  text?: string;
  awayScore?: number;
  homeScore?: number;
  team?: { abbreviation?: string };
};

export type NFLDrivePlay = {
  id: string;
  statYardage?: number;
  isTurnover?: boolean;
  scoringPlay?: boolean;
  type?: { text?: string };
  text?: string;
};

export type NFLPlayInput = {
  gameId: string;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  scoringPlays: NFLScoringPlay[];
  /** Plays from the CURRENT drive only (cheap) — big plays + turnovers. */
  drivePlays?: NFLDrivePlay[];
  /** Play ids already pushed for this game. */
  firedPlayIds: string[];
};

export type NFLPlayResult = {
  events: PushEvent[];
  /** old ∪ newly fired — persist this. */
  firedPlayIds: string[];
};

/** Classify a scoring play into an event type from its ESPN type + text. */
function classifyScoringPlay(p: NFLScoringPlay): PushEvent["type"] | null {
  const abbr = (p.type?.abbreviation ?? "").toUpperCase();
  const name = (p.scoringType?.name ?? "").toLowerCase();
  const text = (p.text ?? "").toLowerCase();
  if (abbr === "TD" || name === "touchdown") {
    if (/interception return|fumble return|return \(/.test(text)) return "nfl-td-defensive";
    if (/ pass from /.test(text)) return "nfl-td-receiving";
    return "nfl-td-rushing";
  }
  if (abbr === "FG" || name === "field-goal") return "nfl-fg";
  if (name === "safety" || /\bsafety\b/.test(text)) return "nfl-safety";
  if (/two-point|2-point|two point/.test(text) || name.includes("two")) return "nfl-2pt";
  return null;
}

export function detectNFLPlays(input: NFLPlayInput): NFLPlayResult {
  const fired = new Set(input.firedPlayIds);
  const events: PushEvent[] = [];
  const base = {
    gameId: input.gameId,
    awayCode: input.awayCode,
    homeCode: input.homeCode,
  };

  // Scoring plays — the reliable TD/FG/safety/2pt source.
  for (const p of input.scoringPlays) {
    if (!p.id || fired.has(p.id)) continue;
    const type = classifyScoringPlay(p);
    if (!type) continue;
    fired.add(p.id);
    events.push({
      ...base,
      type,
      awayScore: p.awayScore ?? input.awayScore,
      homeScore: p.homeScore ?? input.homeScore,
      // The play description IS the fantasy payload ("Caleb Williams 9 Yd
      // Rush"). Trimmed of the trailing kick/conversion parenthetical.
      note: (p.text ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim() || undefined,
      significance: scoreEvent({ type }),
    });
  }

  // Current-drive plays — ≥40yd big plays + turnovers (non-scoring; a scoring
  // big play already fired above). Only the current drive is scanned, so this
  // stays cheap on every tick.
  for (const p of input.drivePlays ?? []) {
    if (!p.id || fired.has(p.id) || p.scoringPlay) continue;
    const text = (p.text ?? "").toLowerCase();
    const typeText = (p.type?.text ?? "").toLowerCase();
    const yards = p.statYardage ?? 0;

    if (p.isTurnover) {
      fired.add(p.id);
      events.push({
        ...base,
        type: "nfl-turnover",
        awayScore: input.awayScore,
        homeScore: input.homeScore,
        note: (p.text ?? "").trim() || undefined,
        significance: scoreEvent({ type: "nfl-turnover" }),
      });
      continue;
    }
    if (yards >= BIG_PLAY_YARDS) {
      const isRec = /reception|pass/.test(typeText) || / pass /.test(text);
      const type: PushEvent["type"] = isRec ? "nfl-big-play-rec" : "nfl-big-play-rush";
      fired.add(p.id);
      events.push({
        ...base,
        type,
        awayScore: input.awayScore,
        homeScore: input.homeScore,
        note: (p.text ?? "").trim() || undefined,
        significance: scoreEvent({ type, yards }),
      });
    }
  }

  return { events, firedPlayIds: Array.from(fired) };
}
