import type { WCScheduleFixture } from "../../api/world-cup/schedule/route";
import { WC_COUNTRIES } from "../following/data/countries";
import { roundKeyFromStage, type KnockoutRoundKey } from "./knockout-data";

// Tournament-wide knockout bracket, derived entirely from ESPN's schedule
// (the trusted source) — no FIFA bracket guessed. ESPN exposes the full
// tree two ways:
//   • R32 fixtures carry slot codes ("2A", "1C", "3RD") that fill with a
//     real country abbreviation once a team clinches that slot.
//   • R16/QF/SF/Final names encode the feed-in match numbers, e.g.
//     "Round of 32 1 Winner at Round of 32 3 Winner". Reading those across
//     the whole knockout window gives the fixed progression below.
//
// The progression (verified from the ESPN feed on 2026-06-23) is a fixed
// property of the bracket, so we encode it as constants and map ESPN's
// real fixtures onto it. Match numbers come from ESPN event-id order within
// each round (ESPN assigns ids in match order); buildWCBracket validates
// the resulting structure and degrades to `resolved: false` if it doesn't
// line up, rather than render a wrong tree.

// Each R16 match (1-8) is fed by two R32 matches (1-16).
const R16_FROM_R32: Record<number, [number, number]> = {
  1: [1, 3], 2: [2, 5], 3: [4, 6], 4: [7, 8],
  5: [11, 12], 6: [9, 10], 7: [14, 16], 8: [13, 15],
};
// Each QF (1-4) is fed by two R16 matches.
const QF_FROM_R16: Record<number, [number, number]> = {
  1: [1, 2], 2: [5, 6], 3: [3, 4], 4: [7, 8],
};
// Each SF (1-2) is fed by two QFs; the Final by the two SFs.
const SF_FROM_QF: Record<number, [number, number]> = { 1: [1, 2], 2: [3, 4] };

// The four quarters of the bracket. Each produces one semifinalist (its QF
// winner). r32/r16 list the feeding match numbers; qf is the QF number.
const QUARTERS: { qf: number; r16: [number, number]; r32: number[] }[] = [
  { qf: 1, r16: [1, 2], r32: [1, 3, 2, 5] },
  { qf: 2, r16: [5, 6], r32: [11, 12, 9, 10] },
  { qf: 3, r16: [3, 4], r32: [4, 6, 7, 8] },
  { qf: 4, r16: [7, 8], r32: [14, 16, 13, 15] },
];

const REAL_CODES = new Set(WC_COUNTRIES.map((c) => c.id));
const NAME_BY_CODE = new Map(WC_COUNTRIES.map((c) => [c.id, c.name]));

/** The user's followed country/team codes, uppercased — the highlight set
 *  every bracket view builds against. Lives here (not in a view file) so
 *  WCBracket, WCBracketTree, and ScheduleClient share one definition. */
export function followedCountrySet(
  follows: { kind: string; id: string }[]
): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (f.kind === "country" || f.kind === "team") out.add(f.id.toUpperCase());
  }
  return out;
}

export type BracketSlot = {
  /** "MEX" for a real team, or a slot code ("2A", "3RD", "R32-1"). */
  code: string;
  /** "Mexico", "Group A runner-up", "Third place", "Winner of match 1". */
  label: string;
  /** True once a real country occupies the slot. */
  real: boolean;
  /** True when the user follows this (real) country. */
  followed: boolean;
  /** Score for this side when the match is played, else null. */
  score: number | null;
  /** Compact feeder pairing ("NOR/BRA") when a winner-of slot resolves to a
   *  known matchup in the feeding round. Raw feed codes like "RD16 W6" read
   *  as jargon; the pairing answers "winner of which match" at a glance. */
  pairToken?: string;
};

export type BracketMatch = {
  round: KnockoutRoundKey;
  /** Match number within its round (R32: 1-16, R16: 1-8, ...). */
  number: number;
  away: BracketSlot;
  home: BracketSlot;
  status: "live" | "upcoming" | "final";
  dateLabel: string | null;
  /** Raw ISO kickoff (from the feed). Null for synthesized upper-round
   *  placeholders that aren't scheduled yet. Feeds the BY DAY grouping so day
   *  heads ("TODAY", "SAT JUL 5") stay in one timezone (America/New_York). */
  dateIso: string | null;
  href: string | null;
};

export type BracketQuarter = {
  index: number; // 1-4
  r32: BracketMatch[]; // 4
  r16: BracketMatch[]; // 2
  qf: BracketMatch | null; // 1
  /** Real countries known in this quarter, for the overview summary. */
  knownTeams: string[];
  /** True if a followed country sits anywhere in this quarter. */
  hasFollowed: boolean;
};

export type WCBracket = {
  quarters: BracketQuarter[];
  semis: BracketMatch[]; // up to 2
  /** The bronze match. Only ever a real published fixture — never
   *  synthesized (data-integrity: no fabricated loser-of pairings). Null
   *  until ESPN publishes it. */
  third: BracketMatch | null;
  final: BracketMatch | null;
  /** True once the R32 is structurally present (16 matches). Bracket UI
   *  shows placeholders before this; falls back to the round-list if false. */
  resolved: boolean;
};

// Humanize an ESPN R32 slot code into a calm label.
//   "2A" -> "Group A runner-up", "1C" -> "Group C winner",
//   "3RD" / unknown -> "Third place".
function slotLabel(code: string): string {
  const m = /^([123])([A-L])$/.exec(code);
  if (m) {
    const pos = m[1];
    const group = `Group ${m[2]}`;
    if (pos === "1") return `${group} winner`;
    if (pos === "2") return `${group} runner-up`;
    return `${group} third`;
  }
  if (/3rd|third/i.test(code)) return "Third place";
  return "To be decided";
}

function makeSlot(
  code: string,
  score: number | null,
  followedCodes: Set<string>
): BracketSlot {
  const up = (code || "").toUpperCase();
  const real = REAL_CODES.has(up);
  return {
    code: real ? up : code,
    label: real ? NAME_BY_CODE.get(up) ?? up : slotLabel(code),
    real,
    followed: real && followedCodes.has(up),
    score,
  };
}

/** Parse a winner-of slot code into the round + match number it references.
 *  Handles both our synthetic codes ("R16-6") and the raw ESPN placeholder
 *  abbreviations that pass through makeSlot ("RD16 W6", "QF W1"). Null for
 *  anything else (real countries, group-feed codes like "2A"/"3RD"). */
export function parseWinnerCode(
  code: string
): { round: KnockoutRoundKey; n: number } | null {
  const c = (code || "").trim().toUpperCase();
  let m = /^RD?(32|16)[\s-]*W(\d+)$/.exec(c); // ESPN: "RD16 W6", "RD32 W9"
  if (m) return { round: m[1] === "32" ? "r32" : "r16", n: Number(m[2]) };
  m = /^(QF|SF)\s*W(\d+)$/.exec(c); // ESPN upper rounds: "QF W1"
  if (m) return { round: m[1].toLowerCase() as KnockoutRoundKey, n: Number(m[2]) };
  m = /^(R32|R16|QF|SF)-(\d+)$/.exec(c); // our synthetic winnerSlot codes
  if (m) return { round: m[1].toLowerCase() as KnockoutRoundKey, n: Number(m[2]) };
  return null;
}

/** Compact display token for a bracket slot. Real → country code. A
 *  group-feed slot keeps its ESPN code ("2A", "3RD") — informative. A
 *  winner-of slot shows its resolved feeder pairing ("NOR/BRA") when known;
 *  otherwise it collapses to an honest "TBD" rather than jargon ("RD16 W6").
 *  Pure — exported for WCBracket's agate rows and the tests. */
export function bracketSlotToken(slot: BracketSlot): string {
  if (slot.real) return slot.code;
  if (slot.pairToken) return slot.pairToken;
  if (parseWinnerCode(slot.code)) return "TBD";
  // ESPN loser-of codes ("SF L1" feeds the third-place match) are jargon
  // with no pairing resolver — an honest TBD beats leaking them.
  if (/^(QF|SF|RD?\d+)\s*L\d+$/i.test((slot.code || "").trim())) return "TBD";
  return slot.code;
}

// A placeholder slot for an unplayed upper-round side: "Winner of match N".
function winnerSlot(round: KnockoutRoundKey, n: number): BracketSlot {
  const label =
    round === "r32"
      ? `Winner of Round of 32 match ${n}`
      : round === "r16"
        ? `Winner of Round of 16 match ${n}`
        : round === "qf"
          ? `Winner of Quarterfinal ${n}`
          : `Winner of Semifinal ${n}`;
  return { code: `${round.toUpperCase()}-${n}`, label, real: false, followed: false, score: null };
}

function fixtureToMatch(
  f: WCScheduleFixture,
  round: KnockoutRoundKey,
  number: number,
  followedCodes: Set<string>
): BracketMatch {
  const played = f.status !== "upcoming";
  return {
    round,
    number,
    away: makeSlot(f.away.abbreviation, played ? f.away.score : null, followedCodes),
    home: makeSlot(f.home.abbreviation, played ? f.home.score : null, followedCodes),
    status: f.status,
    // Device-local day (one-app-day doctrine, 2026-07-06): every
    // user-facing day word renders in the user's own timezone so the
    // bracket, Today, and the masthead agree on what day a match is.
    dateLabel: f.date
      ? new Date(f.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : null,
    dateIso: f.date ?? null,
    href: f.id ? `/game/${f.id}` : null,
  };
}

/** Build the tournament bracket from the full schedule. `follows` are the
 *  user's country/team codes (for highlighting). Pure + deterministic. */
export function buildWCBracket(
  fixtures: WCScheduleFixture[],
  followedCodes: Set<string>
): WCBracket {
  // Group knockout fixtures by round, ordered by ESPN event id (== match
  // order). Non-knockout fixtures (groups) are ignored.
  const byRound = new Map<KnockoutRoundKey, WCScheduleFixture[]>();
  for (const f of fixtures) {
    const key = roundKeyFromStage(f.stage);
    if (!key) continue;
    const arr = byRound.get(key) ?? [];
    arr.push(f);
    byRound.set(key, arr);
  }
  for (const arr of byRound.values()) {
    arr.sort((a, b) => Number(a.id) - Number(b.id));
  }

  // Resolve a winner-of slot ("RD16 W6" / "R16-6") to its feeder pairing
  // ("NOR/BRA") once both sides of that feeder match are real countries.
  // Both code families use ESPN's own match numbering (id order within the
  // round — the verified assumption above), so the lookup stays one-source.
  // Unresolvable slots pass through unchanged and render as "TBD".
  const resolveSlot = (slot: BracketSlot): BracketSlot => {
    if (slot.real) return slot;
    const ref = parseWinnerCode(slot.code);
    if (!ref) return slot;
    const feeder = (byRound.get(ref.round) ?? [])[ref.n - 1];
    if (!feeder) return slot;
    const a = (feeder.away.abbreviation || "").toUpperCase();
    const h = (feeder.home.abbreviation || "").toUpperCase();
    if (!REAL_CODES.has(a) || !REAL_CODES.has(h)) return slot;
    return {
      ...slot,
      label: `Winner of ${NAME_BY_CODE.get(a) ?? a} vs ${NAME_BY_CODE.get(h) ?? h}`,
      pairToken: `${a}/${h}`,
    };
  };
  const enrich = (m: BracketMatch): BracketMatch => ({
    ...m,
    away: resolveSlot(m.away),
    home: resolveSlot(m.home),
  });

  // number -> match, per round (1-indexed by id order).
  const matchOf = (round: KnockoutRoundKey, n: number): BracketMatch | null => {
    const arr = byRound.get(round) ?? [];
    const f = arr[n - 1];
    return f ? enrich(fixtureToMatch(f, round, n, followedCodes)) : null;
  };

  const r32Count = (byRound.get("r32") ?? []).length;
  // Resolved = the knockout structure is real. Sixteen R32 fixtures is the
  // direct signal, but ESPN drops completed fixtures from the schedule
  // window late in the tournament — so any published later-round fixture
  // also proves the groups finished (audit 2026-07-06: the "fills in as
  // the groups finish" line was returning mid-quarterfinals).
  const laterRoundPublished = (["r16", "qf", "sf", "final"] as const).some(
    (k) => (byRound.get(k) ?? []).length > 0
  );
  const resolved = r32Count === 16 || laterRoundPublished;

  const upper = (
    round: KnockoutRoundKey,
    n: number,
    feeds: [number, number],
    feedRound: KnockoutRoundKey
  ): BracketMatch => {
    const real = matchOf(round, n);
    if (real) return real;
    // Not yet in the feed (or unresolved) — synthesize a placeholder from
    // the fixed tree so the structure always renders. Enriched so a known
    // feeder pairing still reads as "NOR/BRA" even before ESPN publishes
    // the upper-round fixture.
    return enrich({
      round,
      number: n,
      away: winnerSlot(feedRound, feeds[0]),
      home: winnerSlot(feedRound, feeds[1]),
      status: "upcoming",
      dateLabel: null,
      dateIso: null,
      href: null,
    });
  };

  const quarters: BracketQuarter[] = QUARTERS.map((q) => {
    const r32 = q.r32.map(
      (n) => matchOf("r32", n) ?? placeholderR32(n, followedCodes)
    );
    const r16 = q.r16.map((n) => upper("r16", n, R16_FROM_R32[n], "r32"));
    const qf = upper("qf", q.qf, QF_FROM_R16[q.qf], "r16");
    const known = new Set<string>();
    let hasFollowed = false;
    for (const m of [...r32, ...r16, qf]) {
      for (const s of [m.away, m.home]) {
        if (s.real) known.add(s.code);
        if (s.followed) hasFollowed = true;
      }
    }
    return { index: q.qf, r32, r16, qf, knownTeams: [...known], hasFollowed };
  });

  const semis = [1, 2].map((n) => upper("sf", n, SF_FROM_QF[n], "qf"));
  const third = matchOf("third", 1);
  const final = upper("final", 1, [1, 2], "sf");

  return { quarters, semis, third, final, resolved };
}

// R32 placeholder when ESPN hasn't published a given match yet — keeps the
// 4x4 grid stable. Labeled generically (the real slot codes arrive with the
// fixture).
function placeholderR32(n: number, _followedCodes: Set<string>): BracketMatch {
  void _followedCodes;
  const blank: BracketSlot = {
    code: `R32-${n}`,
    label: "To be decided",
    real: false,
    followed: false,
    score: null,
  };
  return {
    round: "r32",
    number: n,
    away: blank,
    home: { ...blank },
    status: "upcoming",
    dateLabel: null,
    dateIso: null,
    href: null,
  };
}

export type BracketRound = {
  key: KnockoutRoundKey;
  label: string;
  matches: BracketMatch[]; // in match-number order
  dateLabel: string | null; // earliest known date in the round
};

// Round-ordered view of the bracket for the swipe-through-rounds page.
// Reuses buildWCBracket (the verified tree) and flattens to rounds.
export function buildBracketRounds(
  fixtures: WCScheduleFixture[],
  followedCodes: Set<string>
): { rounds: BracketRound[]; resolved: boolean; hasFollowed: boolean } {
  const b = buildWCBracket(fixtures, followedCodes);
  const byNumber = (a: BracketMatch, z: BracketMatch) => a.number - z.number;
  const r32 = b.quarters.flatMap((q) => q.r32).sort(byNumber);
  const r16 = b.quarters.flatMap((q) => q.r16).sort(byNumber);
  const qf = b.quarters
    .map((q) => q.qf)
    .filter((m): m is BracketMatch => m != null)
    .sort(byNumber);
  const third = b.third ? [b.third] : [];
  const final = b.final ? [b.final] : [];
  const firstDate = (ms: BracketMatch[]) =>
    ms.find((m) => m.dateLabel)?.dateLabel ?? null;

  const rounds: BracketRound[] = [
    { key: "r32", label: "Round of 32", matches: r32, dateLabel: firstDate(r32) },
    { key: "r16", label: "Round of 16", matches: r16, dateLabel: firstDate(r16) },
    { key: "qf", label: "Quarterfinals", matches: qf, dateLabel: firstDate(qf) },
    { key: "sf", label: "Semifinals", matches: b.semis, dateLabel: firstDate(b.semis) },
    { key: "third", label: "Third place", matches: third, dateLabel: firstDate(third) },
    { key: "final", label: "Final", matches: final, dateLabel: firstDate(final) },
  ];

  const hasFollowed = b.quarters.some((q) => q.hasFollowed);
  return { rounds, resolved: b.resolved, hasFollowed };
}

// ── BY DAY view (D3 Task 6a; S1 2026-07-06) ───────────────────────────
// A chronological, day-grouped read of the knockout schedule — the
// Schedule surface's default view. The FULL tournament chronology: past
// days keep their played matches (scores stay No-Spoilers-gated at the
// row), today and future days show fixtures. Day math is device-local
// (one-app-day doctrine): the heads agree with Today's stamps and the
// masthead for every user, not just US Eastern.
// Real-but-undated fixtures collect under "SCHEDULE TO COME" last; pure
// structural placeholders (no teams, no link) are dropped — a day view of
// "TBD · TBD" rows is noise, not schedule.

export type BracketDayGroup = {
  /** Stable key ("2026-07-05" or "no-date") for React lists. */
  key: string;
  /** Uppercase mono day head ("TODAY" | "TOMORROW" | "SAT JUL 5" | "SCHEDULE TO COME"). */
  head: string;
  /** True for days before today — lets the view anchor to TODAY on open. */
  past: boolean;
  matches: BracketMatch[];
};

/** Device-local calendar day key ("2026-07-05") for a given instant — the
 *  grouping bucket. Sorts correctly as a plain string. */
function localDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "SAT JUL 5" from an instant, device-local, uppercase, comma stripped. */
function localDayHead(d: Date): string {
  return d
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase()
    .replace(/,/g, "");
}

/** A match with no teams and no link is a pure structural placeholder — it
 *  carries no schedule information, so it's excluded from the BY DAY view. */
function isStructuralPlaceholder(m: BracketMatch): boolean {
  return !m.away.real && !m.home.real && !m.href;
}

export function groupBracketByDay(
  rounds: BracketRound[],
  now: Date = new Date()
): BracketDayGroup[] {
  const nowKey = localDayKey(now);
  const tomorrowKey = localDayKey(
    new Date(now.getTime() + 24 * 60 * 60 * 1000)
  );

  const byDay = new Map<string, { sample: Date; matches: BracketMatch[] }>();
  const undated: BracketMatch[] = [];

  for (const r of rounds) {
    for (const m of r.matches) {
      const t = m.dateIso ? new Date(m.dateIso).getTime() : NaN;
      if (!Number.isFinite(t)) {
        // Only real-but-unscheduled fixtures reach "SCHEDULE TO COME".
        if (!isStructuralPlaceholder(m)) undated.push(m);
        continue;
      }
      // Past days stay: the day view is the tournament's full chronology
      // (played matches keep their spoiler-gated scores). The view anchors
      // to TODAY via the `past` flag, so the reader lands on now.
      const d = new Date(t);
      const key = localDayKey(d);
      const bucket = byDay.get(key);
      if (bucket) bucket.matches.push(m);
      else byDay.set(key, { sample: d, matches: [m] });
    }
  }

  const groups: BracketDayGroup[] = [...byDay.entries()]
    .sort(([a], [z]) => (a < z ? -1 : a > z ? 1 : 0))
    .map(([key, v]) => {
      const head =
        key === nowKey
          ? "TODAY"
          : key === tomorrowKey
            ? "TOMORROW"
            : localDayHead(v.sample);
      // Chronological within the day, kickoff time then match number.
      const matches = [...v.matches].sort((a, b) => {
        const ta = a.dateIso ? new Date(a.dateIso).getTime() : 0;
        const tb = b.dateIso ? new Date(b.dateIso).getTime() : 0;
        return ta - tb || a.number - b.number;
      });
      return { key, head, past: key < nowKey, matches };
    });

  if (undated.length > 0) {
    groups.push({
      key: "no-date",
      head: "SCHEDULE TO COME",
      past: false,
      matches: undated,
    });
  }
  return groups;
}
