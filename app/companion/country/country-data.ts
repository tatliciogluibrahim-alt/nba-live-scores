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

export type GroupRow = {
  code: string;
  name: string;
  flag: string;
  isSelected: boolean;
  /** Group standing, populated once games in the group have finished.
   *  Undefined pre-tournament (the strip then shows just names + codes,
   *  matching the calm pre-kickoff design). */
  standing?: { played: number; points: number };
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

// Tally group standings (games played + points) from finished
// group-stage games. Win = 3, draw = 1, loss = 0. Keyed by team code.
// Empty until the tournament starts producing finals.
function computeGroupStandings(
  games: WCGameLite[],
  group: string
): Map<string, { played: number; points: number }> {
  const table = new Map<string, { played: number; points: number }>();
  const bump = (code: string, pts: number) => {
    const cur = table.get(code) ?? { played: 0, points: 0 };
    table.set(code, { played: cur.played + 1, points: cur.points + pts });
  };
  for (const g of games) {
    if (g.group !== group || g.status !== "final") continue;
    const h = g.home.abbreviation;
    const a = g.away.abbreviation;
    if (g.home.score > g.away.score) {
      bump(h, 3);
      bump(a, 0);
    } else if (g.away.score > g.home.score) {
      bump(a, 3);
      bump(h, 0);
    } else {
      bump(h, 1);
      bump(a, 1);
    }
  }
  return table;
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

  // Group standings — points + games played per team, tallied from
  // finished group-stage games. Empty pre-tournament. Once games land,
  // the strip shows standings and sorts by points.
  const standings = computeGroupStandings(games, country.group);
  const anyPlayed = Array.from(standings.values()).some((s) => s.played > 0);

  // Group strip — the four members of this country's group, with the
  // selected country flagged. Sorted by points once the tournament has
  // started; directory order before then.
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
      return (b.standing?.points ?? 0) - (a.standing?.points ?? 0);
    });

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
      const standings = computeGroupStandings(games, letter);
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
          return (b.standing?.points ?? 0) - (a.standing?.points ?? 0);
        });
      return { letter, rows, anyPlayed };
    });
}
