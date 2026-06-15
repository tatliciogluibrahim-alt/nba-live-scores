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
import {
  getCountryFixtures,
  type WCStaticFixture,
} from "../following/data/wc-fixtures";
import type { WCGameLite } from "../today/today-data";
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

function gameRowForCountry(
  g: WCGameLite,
  countryCode: string,
  opponents: Map<string, CountryEntry>
): CountryGameRow {
  const isHome = g.home.abbreviation === countryCode;
  const opponentCode = isHome ? g.away.abbreviation : g.home.abbreviation;
  const opponent = opponents.get(opponentCode);

  return {
    id: g.id,
    status: g.status,
    opponentCode,
    opponentName: opponent?.name ?? opponentCode,
    opponentFlag: opponent?.flag ?? "",
    dateLabel: formatDayLabel(g.date),
    timeLabel: formatTimeLabel(g.date),
    stage: g.stage || (g.group ? `Group ${g.group}` : "World Cup"),
    isHome,
    scoreLine:
      g.status === "upcoming"
        ? null
        : `${g.away.score} – ${g.home.score}`,
    watch: g.broadcasts[0]
      ? { channel: g.broadcasts[0] }
      : g.watchLabel
        ? { channel: g.watchLabel }
        : undefined,
    href: `/game/${g.id}`,
    spoilerSubject: `${
      isHome ? opponent?.name ?? opponentCode : countryCode
    } vs ${
      isHome ? countryCode : opponent?.name ?? opponentCode
    }`,
    kickoffISO: g.date,
  };
}

// Build a CountryGameRow from a curated static fixture (wc-fixtures.ts).
// Used when the ESPN feed doesn't yet include this match. Status is
// always "upcoming" — once ESPN's window catches the match, the live
// row replaces this one (matched by team-pair in buildCountryPayload).
function staticRowForCountry(
  sf: WCStaticFixture,
  countryCode: string,
  opponents: Map<string, CountryEntry>
): CountryGameRow {
  const isHome = sf.home === countryCode;
  const opponentCode = isHome ? sf.away : sf.home;
  const opponent = opponents.get(opponentCode);
  return {
    id: sf.id,
    status: "upcoming",
    opponentCode,
    opponentName: opponent?.name ?? opponentCode,
    opponentFlag: opponent?.flag ?? "",
    dateLabel: formatDayLabel(sf.kickoff),
    timeLabel: formatTimeLabel(sf.kickoff),
    stage: `Group ${sf.group}`,
    isHome,
    scoreLine: null,
    // No broadcast/href: static rows aren't deep-linkable to a /game/<id>
    // detail (no feed row exists yet). The view degrades gracefully —
    // tapping the row is a no-op until ESPN provides a real id.
    href: "",
    spoilerSubject: `${
      isHome ? opponent?.name ?? opponentCode : countryCode
    } vs ${
      isHome ? countryCode : opponent?.name ?? opponentCode
    }`,
    kickoffISO: sf.kickoff,
  };
}

// ── Public builder ────────────────────────────────────────────────────

// Build the group table from finished group-stage games: played, points
// (W=3/D=1/L=0), goals for/against, goal difference, and rank (points,
// then GD, then GF — head-to-head, the real next tiebreaker, needs
// per-match lookups and is deferred). `outcome` is filled only when the
// group is mathematically settled (all six games final), so we never
// falsely claim a team is through/out mid-group.
//
// Data caveat: this tallies from /api/world-cup's rolling window. Group
// stage spans ~13 days, so on the final matchday an opening game can be
// near the window edge — if it has rolled off, `outcome` simply stays
// null (safe) rather than claiming a wrong result. The authoritative
// upgrade is ESPN's fifa.world/standings endpoint (a later data pass).
function computeGroupTable(
  games: WCGameLite[],
  group: string
): Map<string, GroupStanding> {
  type Raw = { played: number; points: number; gf: number; ga: number };
  const raw = new Map<string, Raw>();
  const get = (c: string): Raw =>
    raw.get(c) ?? { played: 0, points: 0, gf: 0, ga: 0 };

  let finals = 0;
  for (const g of games) {
    if (g.group !== group || g.status !== "final") continue;
    finals += 1;
    const h = g.home.abbreviation;
    const a = g.away.abbreviation;
    const rh = get(h);
    const ra = get(a);
    rh.played += 1;
    ra.played += 1;
    rh.gf += g.home.score;
    rh.ga += g.away.score;
    ra.gf += g.away.score;
    ra.ga += g.home.score;
    if (g.home.score > g.away.score) rh.points += 3;
    else if (g.away.score > g.home.score) ra.points += 3;
    else {
      rh.points += 1;
      ra.points += 1;
    }
    raw.set(h, rh);
    raw.set(a, ra);
  }

  // A WC group of four plays six games (each pair once). Complete = 6 final.
  const groupComplete = finals >= 6;

  const ranked = Array.from(raw.entries())
    .map(([code, r]) => ({ code, ...r, gd: r.gf - r.ga }))
    .sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);

  const table = new Map<string, GroupStanding>();
  ranked.forEach((r, i) => {
    const position = i + 1;
    const outcome: GroupStanding["outcome"] = !groupComplete
      ? null
      : position <= 2
        ? "through"
        : position === 3
          ? "third"
          : "out";
    table.set(r.code, {
      played: r.played,
      points: r.points,
      gf: r.gf,
      ga: r.ga,
      gd: r.gd,
      position,
      outcome,
    });
  });
  return table;
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

  if (standing.outcome === "through") {
    return {
      eyebrow: "Path",
      line: `${country.name} are through to the Round of 32, finishing ${ord} in Group ${country.group}.`,
      spoilery: true,
    };
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
  const remaining = fixtures.filter((f) => f.status === "upcoming").length;
  const tail = remaining > 0 ? `, ${standing.played} of 3 played.` : ".";
  return {
    eyebrow: "Path",
    line: `${country.name} sit ${ord} in Group ${country.group} on ${pts} (${gdStr} GD)${tail}`,
    spoilery: true,
  };
}

export function buildCountryPayload(
  code: string,
  games: WCGameLite[]
): CountryPayload | null {
  const country = findCountry(code);
  if (!country) return null;

  // Build a quick lookup of every country in the directory for opponent
  // metadata (name + flag).
  const dirByCode = new Map<string, CountryEntry>(
    WC_COUNTRIES.map((c) => [c.id, c])
  );

  const involves = (g: WCGameLite) =>
    g.away.abbreviation === country.id || g.home.abbreviation === country.id;

  const feedFixtures = games
    .filter(involves)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((g) => gameRowForCountry(g, country.id, dirByCode));

  // Merge the curated group-stage fixtures (wc-fixtures.ts) so a country
  // always has all three group matches visible — even when ESPN's
  // rolling window (~10 days forward) hasn't reached a match yet. Live
  // / final / soon-upcoming rows from ESPN win; static rows fill the
  // gaps. Match by sorted team-pair so opponent order doesn't matter.
  const feedPairKeys = new Set(
    feedFixtures.map((f) =>
      [country.id, f.opponentCode].sort().join("-")
    )
  );
  const staticRows: CountryGameRow[] = getCountryFixtures(country.id)
    .filter((sf) => !feedPairKeys.has([sf.away, sf.home].sort().join("-")))
    .map((sf) => staticRowForCountry(sf, country.id, dirByCode));

  const fixtures = [...feedFixtures, ...staticRows].sort((a, b) =>
    a.kickoffISO.localeCompare(b.kickoffISO)
  );

  // Next match = soonest live or upcoming; otherwise null.
  const live = fixtures.find((f) => f.status === "live");
  const upcoming = fixtures.find((f) => f.status === "upcoming");
  const nextMatch = live ?? upcoming ?? null;

  // Group table — played / points / goals / GD / position per team,
  // tallied from finished group-stage games. Empty pre-tournament. Once
  // games land, the strip shows standings and sorts by position.
  const standings = computeGroupTable(games, country.group);
  const anyPlayed = Array.from(standings.values()).some((s) => s.played > 0);

  // Group strip — the four members of this country's group, with the
  // selected country flagged. Sorted by computed position once the
  // tournament has started; directory order before then.
  const groupRows: GroupRow[] = WC_COUNTRIES
    .filter((c) => c.group === country.group)
    .map((c) => ({
      code: c.id,
      name: c.name,
      flag: c.flag,
      isSelected: c.id === country.id,
      standing: standings.get(c.id),
    }))
    .sort((a, b) => {
      if (!anyPlayed) return 0; // keep directory order pre-tournament
      return (a.standing?.position ?? 99) - (b.standing?.position ?? 99);
    });

  // Live, state-aware group stake for the selected country. Null when no
  // group game has finished (the view falls back to the structural
  // pre-kickoff stake).
  const groupStake = buildGroupStake(country, standings.get(country.id), fixtures);

  // Path stages — pre-tournament default. Mark a stage `reached` if a
  // fixture in that stage exists. Group stage is always reachable.
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
  for (const f of fixtures) reachedSet.add(stageKeyForFixture(f));

  const pathStages: PathStage[] = stages.map((s) => ({
    key: s.key,
    label: s.label,
    detail: s.detail,
    reached: reachedSet.has(s.key),
  }));

  return {
    country,
    nextMatch,
    fixtures,
    groupRows,
    pathStages,
    groupStake,
    hasAnyFeed: games.length > 0,
  };
}

/** Convenience: is the tournament under way (any live or final fixture)?
 *  Used by the view layer to decide whether to show "Path updates when
 *  the tournament begins." placeholders vs. the full timeline. */
export function tournamentHasStarted(games: WCGameLite[]): boolean {
  return games.some((g) => g.status === "live" || g.status === "final");
}

// ── All-groups builder (tournament Groups view) ───────────────────────
// One block per group (A–L), each with its member rows. Reuses the same
// standings tally as the single-country GroupStrip so the tournament
// Groups page and the country page can never disagree. Rows sort by
// points once any group game finishes; directory order before then.
// `selectedCode` (the user's followed country, if any) flags its row so
// the view can highlight it in World Cup green.

export type GroupBlock = {
  letter: string;
  rows: GroupRow[];
  /** True once any game in this group has finished — drives whether the
   *  view shows standings vs. just names. */
  anyPlayed: boolean;
};

export function buildAllGroups(
  games: WCGameLite[],
  selectedCode?: string
): GroupBlock[] {
  const sel = selectedCode?.toUpperCase();

  const byGroup = new Map<string, CountryEntry[]>();
  for (const c of WC_COUNTRIES) {
    const arr = byGroup.get(c.group) ?? [];
    arr.push(c);
    byGroup.set(c.group, arr);
  }

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, members]) => {
      const standings = computeGroupTable(games, letter);
      const anyPlayed = Array.from(standings.values()).some((s) => s.played > 0);
      const rows: GroupRow[] = members
        .map((c) => ({
          code: c.id,
          name: c.name,
          flag: c.flag,
          isSelected: c.id === sel,
          standing: standings.get(c.id),
        }))
        .sort((a, b) => {
          if (!anyPlayed) return 0;
          return (a.standing?.position ?? 99) - (b.standing?.position ?? 99);
        });
      return { letter, rows, anyPlayed };
    });
}
