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
};

export type GroupRow = {
  code: string;
  name: string;
  flag: string;
  isSelected: boolean;
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
      detail: "If they finish in the top two of the group — or one of the best third-place finishers.",
    },
    {
      key: "r16",
      label: "Round of 16",
      detail: "Possible path — opponent set by the bracket draw after the group stage.",
    },
    {
      key: "qf",
      label: "Quarterfinals",
      detail: "Possible path — eight teams left.",
    },
    {
      key: "sf",
      label: "Semifinals",
      detail: "Possible path — four teams left.",
    },
    {
      key: "final",
      label: "Final",
      detail: "Possible path — one match for the cup.",
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
  };
}

// ── Public builder ────────────────────────────────────────────────────

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

  const fixtures = games
    .filter(involves)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((g) => gameRowForCountry(g, country.id, dirByCode));

  // Next match = soonest live or upcoming; otherwise null.
  const live = fixtures.find((f) => f.status === "live");
  const upcoming = fixtures.find((f) => f.status === "upcoming");
  const nextMatch = live ?? upcoming ?? null;

  // Group strip — the four members of this country's group, in directory
  // order, with the selected country flagged.
  const groupRows: GroupRow[] = WC_COUNTRIES
    .filter((c) => c.group === country.group)
    .map((c) => ({
      code: c.id,
      name: c.name,
      flag: c.flag,
      isSelected: c.id === country.id,
    }));

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
