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
