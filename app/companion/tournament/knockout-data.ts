// Knockout bracket data — pure transform from the real ESPN schedule
// fixtures (via /api/world-cup/schedule) into ordered rounds of matchups.
//
// Before the group stage ends, ESPN exposes the knockout slots with
// PLACEHOLDER competitors ("Group A 2nd Place", abbreviation "2A"). Those
// aren't real country codes, so a round stays "unresolved" (we show the
// round + its date, not fabricated teams). Once the bracket sets, both
// sides are real country codes and the matchup renders. Nothing fabricated.

import { WC_COUNTRIES } from "../following/data/countries";
import type { WCScheduleFixtureLite } from "../country/country-data";

export type KnockoutRoundKey = "r32" | "r16" | "qf" | "sf" | "final";

export type KnockoutMatch = {
  id: string;
  awayCode: string;
  awayName: string;
  homeCode: string;
  homeName: string;
  status: "live" | "upcoming" | "final";
  /** "2 – 1" for played matches, null for upcoming. */
  scoreLine: string | null;
  dateLabel: string; // "Sat, Jun 28"
  timeLabel: string; // "1:00 PM"
  href: string;
};

export type KnockoutRound = {
  key: KnockoutRoundKey;
  label: string;
  /** Earliest fixture date for the round ("Jun 28"), or null if unknown. */
  dateLabel: string | null;
  /** Resolved matchups (both teams are real countries). Empty until the
   *  bracket sets that round. */
  matches: KnockoutMatch[];
  /** True once at least one real matchup exists for the round. */
  resolved: boolean;
};

const ROUND_ORDER: { key: KnockoutRoundKey; label: string }[] = [
  { key: "r32", label: "Round of 32" },
  { key: "r16", label: "Round of 16" },
  { key: "qf", label: "Quarterfinals" },
  { key: "sf", label: "Semifinals" },
  { key: "final", label: "Final" },
];

const REAL_CODES = new Set(WC_COUNTRIES.map((c) => c.id));
const NAME_BY_CODE = new Map(WC_COUNTRIES.map((c) => [c.id, c.name]));

// Match a stage string to a round key. Handles both the headline form
// ("Round of 32", "Quarterfinals") and the slug form ("round-of-32",
// "quarterfinals"). Quarter/semi are checked before "final" because
// "quarterfinal" and "semifinal" both contain "final".
export function roundKeyFromStage(stage: string): KnockoutRoundKey | null {
  const s = stage.toLowerCase().replace(/-/g, " ");
  if (s.includes("round of 32")) return "r32";
  if (s.includes("round of 16")) return "r16";
  if (s.includes("quarter")) return "qf";
  if (s.includes("semi")) return "sf";
  if (s.includes("final")) return "final";
  return null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toMatch(f: WCScheduleFixtureLite): KnockoutMatch {
  return {
    id: f.id,
    awayCode: f.away.abbreviation,
    awayName: NAME_BY_CODE.get(f.away.abbreviation) ?? f.away.name,
    homeCode: f.home.abbreviation,
    homeName: NAME_BY_CODE.get(f.home.abbreviation) ?? f.home.name,
    status: f.status,
    scoreLine:
      f.status === "upcoming" ? null : `${f.away.score} – ${f.home.score}`,
    dateLabel: fmtDate(f.date),
    timeLabel: fmtTime(f.date),
    href: f.id ? `/game/${f.id}` : "",
  };
}

// ── Advancement outcome (single-elimination) ──────────────────────────
// Knockout matches are win-or-go-home: the winner advances, the loser is
// out. A level match is decided on penalties. These are pure and used by
// the Today advancement card and the Brief. Data-integrity rule: NEVER
// guess a winner — if a final knockout match is level with no usable
// penalty score, return null rather than fabricate an outcome.

export type KnockoutGameLike = {
  stage: string;
  status: "live" | "upcoming" | "final";
  home: { abbreviation: string; score: number };
  away: { abbreviation: string; score: number };
  penaltyHome?: number | null;
  penaltyAway?: number | null;
};

export type KnockoutResult = {
  winnerCode: string;
  loserCode: string;
  stageKey: KnockoutRoundKey;
};

/** Resolve a finished knockout match to its winner/loser, or null if it
 *  isn't a decided knockout match. Penalty-aware. */
export function knockoutResult(game: KnockoutGameLike): KnockoutResult | null {
  if (game.status !== "final") return null;
  const stageKey = roundKeyFromStage(game.stage);
  if (!stageKey) return null; // group stage or unknown — not a knockout
  const { home: h, away: a } = game;
  let winnerHome: boolean;
  if (h.score > a.score) winnerHome = true;
  else if (a.score > h.score) winnerHome = false;
  else {
    // Level after regulation/extra time → penalties decide it.
    const ph = game.penaltyHome;
    const pa = game.penaltyAway;
    if (typeof ph === "number" && typeof pa === "number" && ph !== pa) {
      winnerHome = ph > pa;
    } else {
      return null; // undecided / no usable penalty score — never guess
    }
  }
  return {
    winnerCode: winnerHome ? h.abbreviation : a.abbreviation,
    loserCode: winnerHome ? a.abbreviation : h.abbreviation,
    stageKey,
  };
}

/** A country's outcome in a finished knockout match: advanced, eliminated,
 *  or null when the match doesn't decide that country (not involved, not a
 *  decided knockout match). */
export function countryKnockoutOutcome(
  game: KnockoutGameLike,
  countryCode: string
): "advanced" | "eliminated" | null {
  const r = knockoutResult(game);
  if (!r) return null;
  if (r.winnerCode === countryCode) return "advanced";
  if (r.loserCode === countryCode) return "eliminated";
  return null;
}

const NEXT_STAGE_LABEL: Record<KnockoutRoundKey, string> = {
  r32: "Round of 16",
  r16: "Quarterfinals",
  qf: "Semifinals",
  sf: "Final",
  final: "Champions", // winning the final wins the tournament
};

/** Where a winner goes next ("Round of 16", … or "Champions" for the
 *  final). Used for the advancement headline. */
export function nextStageLabel(stage: KnockoutRoundKey): string {
  return NEXT_STAGE_LABEL[stage];
}

/** Build the five knockout rounds from the full schedule. `staticDates` maps
 *  a round key to a fallback ISO date (from WC_KNOCKOUT_ROUNDS) so a round
 *  with no fixtures in the feed yet still shows its scheduled date. */
export function buildKnockoutRounds(
  fixtures: WCScheduleFixtureLite[],
  staticDates: Partial<Record<KnockoutRoundKey, string>> = {}
): KnockoutRound[] {
  const byRound = new Map<KnockoutRoundKey, WCScheduleFixtureLite[]>();
  for (const f of fixtures) {
    const k = roundKeyFromStage(f.stage);
    if (!k) continue;
    const list = byRound.get(k);
    if (list) list.push(f);
    else byRound.set(k, [f]);
  }

  return ROUND_ORDER.map(({ key, label }) => {
    const fx = (byRound.get(key) ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    const matches = fx
      .filter(
        (f) =>
          REAL_CODES.has(f.home.abbreviation) &&
          REAL_CODES.has(f.away.abbreviation)
      )
      .map(toMatch);
    const dateISO = fx[0]?.date ?? staticDates[key] ?? null;
    return {
      key,
      label,
      dateLabel: dateISO ? fmtShortDate(dateISO) : null,
      matches,
      resolved: matches.length > 0,
    };
  });
}
