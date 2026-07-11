// Knockout bracket data — pure transform from the real ESPN schedule
// fixtures (via /api/world-cup/schedule) into ordered rounds of matchups.
//
// Before the group stage ends, ESPN exposes the knockout slots with
// PLACEHOLDER competitors ("Group A 2nd Place", abbreviation "2A"). Those
// aren't real country codes, so a round stays "unresolved" (we show the
// round + its date, not fabricated teams). Once the bracket sets, both
// sides are real country codes and the matchup renders. Nothing fabricated.

import { WC_COUNTRIES } from "../following/data/countries";
import { WC_KNOCKOUT_ROUNDS } from "../following/data/wc-fixtures";
import type { WCScheduleFixtureLite } from "../country/country-data";

export type KnockoutRoundKey = "r32" | "r16" | "qf" | "sf" | "third" | "final";

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
  /** The same earliest fixture date as a raw ISO string (or null). Used by
   *  YOUR PATH (path-data.ts) to phrase the "next round starts …" note with
   *  day-name-vs-date logic. dateLabel is the pre-formatted display string;
   *  startISO is the machine value. */
  startISO: string | null;
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
  { key: "third", label: "Third place" },
  { key: "final", label: "Final" },
];

const REAL_CODES = new Set(WC_COUNTRIES.map((c) => c.id));
const NAME_BY_CODE = new Map(WC_COUNTRIES.map((c) => [c.id, c.name]));

/** True when the code is a real World Cup country, not an ESPN slot
 *  placeholder ("2A", "QFW1", "SF L2"). One definition for every surface
 *  that must not print feed jargon (Today's NEXT pointer, the widget). */
export function isRealCountryCode(code: string): boolean {
  return REAL_CODES.has((code || "").toUpperCase());
}

// Scheduled round dates from wc-fixtures.ts, keyed for the builder's
// static-date fallback so a round with no feed fixtures still shows when.
// Exported so every knockout surface (the desktop stack in WCKnockout, the
// mobile preview in TournamentClient) shares one source of round dates.
const SHORT_TO_KEY: Record<string, KnockoutRoundKey> = {
  R32: "r32",
  R16: "r16",
  QF: "qf",
  SF: "sf",
  F: "final",
};

export const KNOCKOUT_STATIC_DATES: Partial<Record<KnockoutRoundKey, string>> =
  Object.fromEntries(
    WC_KNOCKOUT_ROUNDS.map(
      (r) => [SHORT_TO_KEY[r.short], r.kickoffISO] as const,
    ).filter(([k]) => Boolean(k)),
  ) as Partial<Record<KnockoutRoundKey, string>>;

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
  // ESPN tags the bronze match "3rd Place"; some feeds say "third place
  // play-off". Checked before "final" so no variant ever falls through.
  if (s.includes("3rd") || s.includes("third")) return "third";
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
  // Third place is display-only: nobody advances and the loser was
  // already eliminated in the semifinal, so it never produces an
  // advancement moment or a Brief line.
  if (stageKey === "third") return null;
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
  third: "Third place", // unreachable: knockoutResult skips the round
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
      startISO: dateISO,
      matches,
      resolved: matches.length > 0,
    };
  });
}

// ── Mobile knockout preview (System D, D3 Task 4) ─────────────────────
// The tournament overview page shows ONE round (the current one) as a short
// agate list, not the full five-round stack. This builder shapes that: it
// picks the current round, includes BOTH resolved matchups (real country
// codes) and ESPN's slot placeholders ("2A" = Group A runner-up) — the
// placeholders come from the feed, nothing is fabricated — and reports the
// round total so the caller can say "ALL N MATCHES →".

export type KnockoutPreviewRow = {
  id: string;
  awayCode: string;
  homeCode: string;
  awayName: string;
  homeName: string;
  /** True when either side is not yet a real country (an ESPN slot
   *  placeholder) — the caller renders it muted and non-tappable. */
  placeholder: boolean;
  /** Which side is the followed country, for ink emphasis. */
  followedSide: "away" | "home" | null;
  status: "live" | "upcoming" | "final";
  /** "2 – 1" (en-dash), spoilery; null until the match is played. */
  scoreLine: string | null;
  /** Played and level on the scoreboard — no winner emphasis (§10). A true
   *  knockout tie resolves via ET/penalties, but knockout-data does not yet
   *  carry penalty fields (KnockoutMatch/WCScheduleFixtureLite have none), so
   *  AET/PENS stamps are intentionally NOT wired — comment left for when the
   *  feed exposes them. */
  level: boolean;
  /** ISO kickoff — the caller formats the day-time stamp from it. */
  dateISO: string;
  /** /game/{id} when tappable, else "" (placeholder or missing id). */
  href: string;
};

export type KnockoutPreview = {
  roundKey: KnockoutRoundKey;
  roundLabel: string;
  /** "Jun 28 – Jul 2", a single "Jul 3", or null when unknown. */
  dateRange: string | null;
  /** Up to `limit` rows from the current round. */
  rows: KnockoutPreviewRow[];
  /** Total fixtures in the round — drives "ALL N MATCHES". */
  total: number;
  /** Whether any fixture (resolved or placeholder) exists for the round. */
  hasFixtures: boolean;
};

/** The round to preview: the earliest round with an unplayed match (the one
 *  in progress / up next), else the deepest round that has fixtures (the
 *  tournament is winding down), else R32 as the honest knockout entry. */
function pickCurrentRound(
  byRound: Map<KnockoutRoundKey, WCScheduleFixtureLite[]>,
): KnockoutRoundKey {
  for (const { key } of ROUND_ORDER) {
    const fx = byRound.get(key);
    if (fx && fx.some((f) => f.status !== "final")) return key;
  }
  for (let i = ROUND_ORDER.length - 1; i >= 0; i--) {
    const key = ROUND_ORDER[i].key;
    if ((byRound.get(key) ?? []).length > 0) return key;
  }
  return "r32";
}

function buildDateRange(firstISO: string | null, lastISO: string | null): string | null {
  if (!firstISO) return null;
  const first = fmtShortDate(firstISO);
  const last = lastISO ? fmtShortDate(lastISO) : first;
  if (!first) return null;
  return first === last ? first : `${first} – ${last}`;
}

export function buildKnockoutPreview(
  fixtures: WCScheduleFixtureLite[],
  staticDates: Partial<Record<KnockoutRoundKey, string>> = {},
  followedCode?: string | null,
  limit = 5,
): KnockoutPreview {
  const followed = followedCode ? followedCode.toUpperCase() : null;

  const byRound = new Map<KnockoutRoundKey, WCScheduleFixtureLite[]>();
  for (const f of fixtures) {
    const k = roundKeyFromStage(f.stage);
    if (!k) continue;
    const list = byRound.get(k);
    if (list) list.push(f);
    else byRound.set(k, [f]);
  }

  const roundKey = pickCurrentRound(byRound);
  const roundLabel = ROUND_ORDER.find((r) => r.key === roundKey)?.label ?? "Round of 32";
  const fx = (byRound.get(roundKey) ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows: KnockoutPreviewRow[] = fx.slice(0, limit).map((f) => {
    const awayCode = f.away.abbreviation;
    const homeCode = f.home.abbreviation;
    const placeholder = !REAL_CODES.has(awayCode) || !REAL_CODES.has(homeCode);
    const played = f.status !== "upcoming";
    const followedSide =
      followed && awayCode === followed
        ? "away"
        : followed && homeCode === followed
          ? "home"
          : null;
    return {
      id: f.id,
      awayCode,
      homeCode,
      awayName: NAME_BY_CODE.get(awayCode) ?? f.away.name,
      homeName: NAME_BY_CODE.get(homeCode) ?? f.home.name,
      placeholder,
      followedSide,
      status: f.status,
      scoreLine: played ? `${f.away.score} – ${f.home.score}` : null,
      level: played && f.away.score === f.home.score,
      dateISO: f.date,
      href: f.id && !placeholder ? `/game/${f.id}` : "",
    };
  });

  const dates = fx.map((f) => f.date).filter(Boolean).sort();
  const firstISO = dates[0] ?? staticDates[roundKey] ?? null;
  const lastISO = dates[dates.length - 1] ?? firstISO;

  return {
    roundKey,
    roundLabel,
    dateRange: buildDateRange(firstISO, lastISO),
    rows,
    total: fx.length,
    hasFixtures: fx.length > 0,
  };
}
