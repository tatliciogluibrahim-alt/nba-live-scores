// Country Dashboard data layer.
//
// Country metadata (name, group, flag) lives in the static directory
// app/companion/following/data/countries.ts (Stage 4). Match data comes
// from /api/world-cup. We adapt both into a single payload here.
//
// Pure functions — the hook does the I/O.

import {
  WC_COUNTRIES,
  type CountryEntry,
} from "../following/data/countries";
import type { Stake } from "../stakes/derive-stakes";

// ── Shapes ────────────────────────────────────────────────────────────

export type CountryGameRow = {
  id: string;
  status: "live" | "upcoming" | "final";
  opponentCode: string;
  opponentName: string;
  opponentFlag: string;
  dateLabel: string;       // "Sat, Jun 14"
  timeLabel: string;       // "3:00 PM"
  stage: string;           // "Group G" | "Round of 32" | ...
  /** Where this country played — true if home, false if away. */
  isHome: boolean;
  scoreLine: string | null;  // spoilery — null for upcoming
  watch?: { channel: string; stream?: string };
  href: string;            // /game/{id}
  spoilerSubject: string;  // "Belgium vs Egypt"
  /** ISO kickoff timestamp — internal sort key, never rendered. Both
   *  feed-derived and static-curated rows stamp this so the merged
   *  fixtures list sorts chronologically regardless of source. */
  kickoffISO: string;
};

/** A team's standing in its group, computed from finished group games.
 *  Goal difference + position turn the strip from "4 PTS" into a table a
 *  fan can actually read. `outcome` is set only once the group is
 *  mathematically settled (all six group games final) — we never guess
 *  clinch/elimination scenarios. "third" = finished 3rd; may still
 *  advance as a best third-place finisher, so it's never called "out". */
export type GroupStanding = {
  played: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  position: number;
  outcome: "through" | "third" | "out" | null;
};

export type GroupRow = {
  code: string;
  name: string;
  flag: string;
  isSelected: boolean;
  /** Group standing, populated once games in the group have finished.
   *  Undefined pre-tournament (the strip then shows just names + codes,
   *  matching the calm pre-kickoff design). */
  standing?: GroupStanding;
};

export type PathStage = {
  key: string;
  label: string;            // "Group Stage" | "Round of 32"
  detail: string;           // scenario language — see PATH_TEMPLATE
  reached: boolean;         // safe under NS — only true if data confirms it
};

export type CountryPayload = {
  country: CountryEntry;

  /** Next upcoming match for this country, or the live one if any. */
  nextMatch: CountryGameRow | null;

  /** All fixtures involving this country, chronological. */
  fixtures: CountryGameRow[];

  /** The four group members in seeded order. */
  groupRows: GroupRow[];

  /** Scaffolded possible-path timeline. */
  pathStages: PathStage[];

  /** Live, state-aware group stake ("USA sit 2nd on 4 points" / "USA are
   *  through" / "USA are out"). Spoilery — the view gates it under
   *  No-Spoilers. Null pre-tournament (the view falls back to the
   *  structural pre-kickoff stake) or when no group game has finished. */
  groupStake: Stake | null;

  /** True when /api/world-cup returned any fixtures for the tournament. */
  hasAnyFeed: boolean;
};

// ── Path scaffold (scenario-only, structural copy) ────────────────────
// Six stages. Pre-tournament: only the Group stage exists with real data.
// All later stages use scenario language. Once a real fixture lands in
// a later stage, the adapter flips `reached` to true for that stage.

type PathTemplate = { key: PathStage["key"]; label: string; detail: string };

function pathTemplate(group: string): PathTemplate[] {
  return [
    {
      key: "group",
      label: "Group Stage",
      detail: `Three matches in Group ${group}.`,
    },
    {
      key: "r32",
      label: "Round of 32",
      detail: "If they finish in the top two of the group, or as one of the best third-place finishers.",
    },
    {
      key: "r16",
      label: "Round of 16",
      detail: "Possible path. Opponent set by the bracket draw after the group stage.",
    },
    {
      key: "qf",
      label: "Quarterfinals",
      detail: "Possible path. Eight teams left.",
    },
    {
      key: "sf",
      label: "Semifinals",
      detail: "Possible path. Four teams left.",
    },
    {
      key: "final",
      label: "Final",
      detail: "Possible path. One match for the cup.",
    },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDayLabel(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function findCountry(code: string): CountryEntry | null {
  const upper = code.toUpperCase();
  return WC_COUNTRIES.find((c) => c.id === upper) ?? null;
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th"];

/** Live, state-aware group stake. Replaces the null the pre-tournament
 *  deriver returns once games start — so the country page stops going
 *  silent at the exact moment advancement is on the line. Spoilery (it
 *  reveals standings/outcome); the StakesLine gates it under No-Spoilers. */
function buildGroupStake(
  country: CountryEntry,
  standing: GroupStanding | undefined,
  fixtures: CountryGameRow[]
): Stake | null {
  if (!standing || standing.played === 0) return null;
  const ord = ORDINAL[standing.position] ?? `${standing.position}th`;
  const pts = `${standing.points} ${standing.points === 1 ? "point" : "points"}`;
  const gdStr = standing.gd > 0 ? `+${standing.gd}` : `${standing.gd}`;
  const remaining = fixtures.filter((f) => f.status === "upcoming").length;

  if (standing.outcome === "through") {
    // Early clinch (games still to play) reads "have clinched"; once the
    // group is done it reports the final finishing position.
    const line =
      remaining > 0
        ? `${country.name} have clinched a place in the Round of 32 from Group ${country.group}.`
        : `${country.name} are through to the Round of 32, finishing ${ord} in Group ${country.group}.`;
    return { eyebrow: "Path", line, spoilery: true };
  }
  if (standing.outcome === "out") {
    return {
      eyebrow: "Path",
      line: `${country.name} are out, finishing ${ord} in Group ${country.group} on ${pts}.`,
      spoilery: true,
    };
  }
  if (standing.outcome === "third") {
    return {
      eyebrow: "Path",
      line: `${country.name} finished 3rd in Group ${country.group}. A best third-place spot could still see them through.`,
      spoilery: true,
    };
  }
  // In progress — position, points, GD, and games left.
  const tail = remaining > 0 ? `, ${standing.played} of 3 played.` : ".";
  return {
    eyebrow: "Path",
    line: `${country.name} sit ${ord} in Group ${country.group} on ${pts} (${gdStr} GD)${tail}`,
    spoilery: true,
  };
}

// One CountryGameRow from a real ESPN schedule fixture (away-then-home
// order preserved). Replaces the feed+static merge: the schedule is
// already complete and real, so there's nothing to fabricate or dedupe.
function countryRowFromScheduleFixture(
  f: WCScheduleFixtureLite,
  countryCode: string,
  dir: Map<string, CountryEntry>
): CountryGameRow {
  const isHome = f.home.abbreviation === countryCode;
  const opponentCode = isHome ? f.away.abbreviation : f.home.abbreviation;
  const opponent = dir.get(opponentCode);
  const awayName = dir.get(f.away.abbreviation)?.name ?? f.away.name;
  const homeName = dir.get(f.home.abbreviation)?.name ?? f.home.name;
  return {
    id: f.id,
    status: f.status,
    opponentCode,
    opponentName: opponent?.name ?? (isHome ? f.away.name : f.home.name),
    opponentFlag: opponent?.flag ?? "",
    dateLabel: formatDayLabel(f.date),
    timeLabel: formatTimeLabel(f.date),
    stage: f.stage || (f.group ? `Group ${f.group}` : "Summer Soccer"),
    isHome,
    scoreLine:
      f.status === "upcoming" ? null : `${f.away.score} – ${f.home.score}`,
    watch: f.broadcasts[0] ? { channel: f.broadcasts[0] } : undefined,
    href: f.id ? `/game/${f.id}` : "",
    spoilerSubject: `${awayName} vs ${homeName}`,
    kickoffISO: f.date,
  };
}

/** Deterministic top-2 clinch within a group. A team has secured a top-two
 *  finish (a guaranteed Round of 32 place) when at most one OTHER team can
 *  still reach or exceed its CURRENT points. Conservative by construction:
 *  it uses the team's current points as its floor (worst case: it loses its
 *  remaining games) and each rival's maximum (wins them all), and treats
 *  "could tie" as "could finish above" since tiebreakers aren't modeled. So
 *  it never claims a clinch a remaining result could undo. Group-internal
 *  only: it does NOT attempt the cross-group "best third place" math, which
 *  depends on other groups and can flip. */
export function clinchedTopTwo(
  rows: Pick<WCScheduleStandingLite, "code" | "points" | "played">[],
  code: string
): boolean {
  const me = rows.find((r) => r.code === code);
  if (!me || rows.length < 2) return false;
  const rivalsAbleToCatch = rows.filter((r) => {
    if (r.code === code) return false;
    const rivalMax = r.points + 3 * Math.max(0, 3 - r.played);
    return rivalMax >= me.points;
  }).length;
  return rivalsAbleToCatch <= 1;
}

// Map ESPN's official standing row into the app's GroupStanding shape.
// `clinched` flips a team to "through" before the group is mathematically
// complete (early top-2 clinch). Once the group is complete, the final
// position decides through / third / out.
function toGroupStanding(
  s: WCScheduleStandingLite,
  groupComplete: boolean,
  clinched: boolean
): GroupStanding {
  const outcome: GroupStanding["outcome"] = groupComplete
    ? s.position <= 2
      ? "through"
      : s.position === 3
        ? "third"
        : "out"
    : clinched
      ? "through"
      : null;
  return {
    played: s.played,
    points: s.points,
    gf: s.gf,
    ga: s.ga,
    gd: s.gd,
    position: s.position,
    outcome,
  };
}

export function buildCountryPayload(
  code: string,
  fixtures: WCScheduleFixtureLite[],
  standings: Record<string, WCScheduleStandingLite[]>
): CountryPayload | null {
  const country = findCountry(code);
  if (!country) return null;

  const dirByCode = new Map<string, CountryEntry>(
    WC_COUNTRIES.map((c) => [c.id, c])
  );

  // Every real fixture involving this country, chronological. Complete by
  // construction — the schedule endpoint carries the whole tournament.
  const countryFixtures: CountryGameRow[] = fixtures
    .filter(
      (f) =>
        f.away.abbreviation === country.id ||
        f.home.abbreviation === country.id
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((f) => countryRowFromScheduleFixture(f, country.id, dirByCode));

  const live = countryFixtures.find((f) => f.status === "live");
  const upcoming = countryFixtures.find((f) => f.status === "upcoming");
  const nextMatch = live ?? upcoming ?? null;

  // Official group standings (real points / GP / GD / rank).
  const groupRowsRaw = standings[country.group] ?? [];
  const table = new Map<string, WCScheduleStandingLite>(
    groupRowsRaw.map((s) => [s.code, s])
  );
  const anyPlayed = groupRowsRaw.some((s) => s.played > 0);
  const groupComplete =
    groupRowsRaw.length > 0 && groupRowsRaw.every((s) => s.played >= 3);

  // Early top-2 clinch per team (only meaningful before the group is
  // complete — once complete, final position decides the outcome).
  const clinchedByCode = new Map<string, boolean>();
  for (const s of groupRowsRaw) {
    clinchedByCode.set(s.code, !groupComplete && clinchedTopTwo(groupRowsRaw, s.code));
  }

  const groupRows: GroupRow[] = WC_COUNTRIES.filter(
    (c) => c.group === country.group
  )
    .map((c) => {
      const s = table.get(c.id);
      return {
        code: c.id,
        name: c.name,
        flag: c.flag,
        isSelected: c.id === country.id,
        standing: s
          ? toGroupStanding(s, groupComplete, clinchedByCode.get(c.id) ?? false)
          : undefined,
      };
    })
    .sort((a, b) => {
      if (!anyPlayed) return 0;
      return (a.standing?.position ?? 99) - (b.standing?.position ?? 99);
    });

  // Live, state-aware group stake for the selected country.
  const ownStanding = table.get(country.id);
  const groupStake =
    anyPlayed && ownStanding
      ? buildGroupStake(
          country,
          toGroupStanding(
            ownStanding,
            groupComplete,
            clinchedByCode.get(country.id) ?? false
          ),
          countryFixtures
        )
      : null;

  // Path stages — mark a stage `reached` if a fixture in it exists.
  const stages = pathTemplate(country.group);
  const stageKeyForFixture = (f: CountryGameRow): PathStage["key"] => {
    const s = f.stage.toLowerCase();
    if (s.startsWith("group")) return "group";
    if (s.includes("round of 32")) return "r32";
    if (s.includes("round of 16")) return "r16";
    if (s.includes("quarter")) return "qf";
    if (s.includes("semi")) return "sf";
    if (s.includes("final")) return "final";
    return "group";
  };
  const reachedSet = new Set<PathStage["key"]>(["group"]);
  // First real fixture per knockout stage — lets the path show the actual
  // opponent ("vs Portugal · Sat Jun 28") instead of the generic template
  // copy, the moment the bracket sets that round.
  const fixtureByStage = new Map<PathStage["key"], CountryGameRow>();
  for (const f of countryFixtures) {
    const k = stageKeyForFixture(f);
    reachedSet.add(k);
    if (k !== "group" && !fixtureByStage.has(k)) fixtureByStage.set(k, f);
  }
  const pathStages: PathStage[] = stages.map((s) => {
    const fx = fixtureByStage.get(s.key);
    const detail =
      fx && fx.opponentName
        ? `vs ${fx.opponentName} · ${fx.dateLabel}`
        : s.detail;
    return { key: s.key, label: s.label, detail, reached: reachedSet.has(s.key) };
  });

  return {
    country,
    nextMatch,
    fixtures: countryFixtures,
    groupRows,
    pathStages,
    groupStake,
    hasAnyFeed: fixtures.length > 0,
  };
}

/** Convenience: is the tournament under way (any live or final fixture)? */
export function tournamentHasStarted(
  fixtures: WCScheduleFixtureLite[]
): boolean {
  return fixtures.some((f) => f.status === "live" || f.status === "final");
}

export type GroupScheduleRow = {
  id: string;
  matchday: number;          // 1 | 2 | 3, or 0 if unmapped
  awayCode: string;
  homeCode: string;
  awayName: string;
  homeName: string;
  status: "live" | "upcoming" | "final";
  /** Away / home goals once the match is live or final; null for upcoming
   *  (and for static rows the feed hasn't reached). Canonical away-then-home
   *  order, matching Today / Game Detail / Watching / the lock screen. */
  awayScore: number | null;
  homeScore: number | null;
  /** Feed status detail — the live minute ("67'", "HT") or the end state
   *  ("FT" / "AET" / "Pens"). Empty for static-only rows. */
  statusText: string;
  dateLabel: string;         // "Sat, Jun 20"
  timeLabel: string;         // "3:00 PM"
  kickoffISO: string;        // sort key
  /** True for a static fixture whose kickoff has already passed but which
   *  the rolling feed window no longer covers — the match has been played,
   *  we just can't see the result. Rendered as "Awaiting result" (never a
   *  false "Upcoming") and excluded from the "Next" line. */
  awaitingResult: boolean;
  /** /game/<id> when a real feed row backs it; "" for static-only. */
  href: string;
};

export type GroupDetail = {
  letter: string;
  rows: GroupRow[];
  /** All six group matches, chronological. Always complete (static fills
   *  any match the rolling feed window hasn't reached). */
  schedule: GroupScheduleRow[];
  /** True when numeric standings can be trusted (see honesty gate above). */
  standingsTrustworthy: boolean;
  /** "upcoming" before first kickoff · "live" once underway · "complete"
   *  once all six are final. Drives the calm status chip. */
  phase: "upcoming" | "live" | "complete";
  /** Soonest live-or-upcoming match, for the always-visible "Next" line. */
  next: GroupScheduleRow | null;
  /** Day label of the group's opener, shown while phase === "upcoming". */
  startsLabel: string | null;
};

// ── Real-data all-groups builder (ESPN full schedule + standings) ──────
// Consumes /api/world-cup/schedule: the COMPLETE tournament fixture list
// and the OFFICIAL standings, both straight from ESPN. No rolling-window
// gaps to fill, so nothing is fabricated and no homegrown standings math
// is needed — every match, time, score, and table is real. This is what
// the groups page and the country page both build from.

export type WCScheduleFixtureLite = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
  broadcasts: string[];
};

export type WCScheduleStandingLite = {
  code: string;
  played: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  position: number;
};

function scheduleRow(
  f: WCScheduleFixtureLite,
  dir: Map<string, CountryEntry>
): GroupScheduleRow {
  const a = f.away.abbreviation;
  const h = f.home.abbreviation;
  return {
    id: f.id,
    matchday: 0, // assigned by chronological rank below
    awayCode: a,
    homeCode: h,
    awayName: dir.get(a)?.name ?? f.away.name,
    homeName: dir.get(h)?.name ?? f.home.name,
    status: f.status,
    awayScore: f.status === "upcoming" ? null : f.away.score,
    homeScore: f.status === "upcoming" ? null : f.home.score,
    statusText: f.statusText,
    dateLabel: formatDayLabel(f.date),
    timeLabel: formatTimeLabel(f.date),
    kickoffISO: f.date,
    awaitingResult: false, // full schedule is always present
    href: f.id ? `/game/${f.id}` : "",
  };
}

export function buildAllGroupsFromSchedule(
  fixtures: WCScheduleFixtureLite[],
  standings: Record<string, WCScheduleStandingLite[]>,
  selectedCode?: string
): GroupDetail[] {
  const sel = selectedCode?.toUpperCase();
  const dirByCode = new Map<string, CountryEntry>(
    WC_COUNTRIES.map((c) => [c.id, c])
  );

  const byGroup = new Map<string, CountryEntry[]>();
  for (const c of WC_COUNTRIES) {
    const arr = byGroup.get(c.group) ?? [];
    arr.push(c);
    byGroup.set(c.group, arr);
  }

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, members]) => {
      const memberCodes = new Set(members.map((c) => c.id));

      const schedule = fixtures
        .filter(
          (f) =>
            f.group === letter &&
            memberCodes.has(f.away.abbreviation) &&
            memberCodes.has(f.home.abbreviation)
        )
        .map((f) => scheduleRow(f, dirByCode))
        .sort((a, b) => a.kickoffISO.localeCompare(b.kickoffISO));
      schedule.forEach((m, i) => {
        m.matchday = Math.min(Math.floor(i / 2) + 1, 3);
      });

      // Official standings, keyed by team code.
      const table = new Map<string, WCScheduleStandingLite>(
        (standings[letter] ?? []).map((s) => [s.code, s])
      );
      const anyPlayed = (standings[letter] ?? []).some((s) => s.played > 0);
      const groupComplete =
        (standings[letter]?.length ?? 0) > 0 &&
        (standings[letter] ?? []).every((s) => s.played >= 3);

      const rows: GroupRow[] = members
        .map((c) => {
          const s = table.get(c.id);
          const standing: GroupStanding | undefined = s
            ? {
                played: s.played,
                points: s.points,
                gf: s.gf,
                ga: s.ga,
                gd: s.gd,
                position: s.position,
                outcome: !groupComplete
                  ? null
                  : s.position <= 2
                    ? "through"
                    : s.position === 3
                      ? "third"
                      : "out",
              }
            : undefined;
          return {
            code: c.id,
            name: c.name,
            flag: c.flag,
            isSelected: c.id === sel,
            standing,
          };
        })
        .sort((a, b) => {
          if (!anyPlayed) return 0;
          return (a.standing?.position ?? 99) - (b.standing?.position ?? 99);
        });

      const allFinal =
        schedule.length > 0 && schedule.every((r) => r.status === "final");
      const anyStarted = schedule.some((r) => r.status !== "upcoming");
      const phase: GroupDetail["phase"] = allFinal
        ? "complete"
        : anyStarted
          ? "live"
          : "upcoming";

      const next =
        schedule.find((r) => r.status === "live") ??
        schedule.find((r) => r.status === "upcoming") ??
        null;
      const startsLabel =
        phase === "upcoming" && schedule[0] ? schedule[0].dateLabel : null;

      return {
        letter,
        rows,
        schedule,
        standingsTrustworthy: anyPlayed, // real table — trustworthy once played
        phase,
        next,
        startsLabel,
      };
    });
}
