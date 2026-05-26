import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ESPNTeam = {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  logo?: string;
  logos?: {
    href?: string;
  }[];
};

type ESPNCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: ESPNTeam;
  statistics?: ESPNStatistic[];
  leaders?: ESPNLeaderGroup[];
  linescores?: { value?: number; displayValue?: string }[];
};

type ESPNStatus = {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: {
    id?: string;
    name?: string;
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type ESPNStatistic = {
  name?: string;
  label?: string;
  abbreviation?: string;
  displayValue?: string;
};

type ESPNLeaderGroup = {
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  leaders?: {
    displayValue?: string;
    athlete?: {
      displayName?: string;
      shortName?: string;
    };
  }[];
};

type ESPNBroadcast = {
  names?: string[];
  media?: {
    shortName?: string;
    name?: string;
  };
};

type ESPNOdds = {
  details?: string;
  overUnder?: number;
};

type ESPNCompetition = {
  id?: string;
  date?: string;
  status?: ESPNStatus;
  competitors?: ESPNCompetitor[];
  broadcasts?: ESPNBroadcast[];
  odds?: ESPNOdds[];
  notes?: {
    type?: string;
    headline?: string;
  }[];
  series?: {
    type?: string;
    title?: string;
    summary?: string;
    completed?: boolean;
    totalCompetitions?: number;
  };
};

type ESPNEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: ESPNStatus;
  competitions?: ESPNCompetition[];
};

type ESPNScoreboardResponse = {
  events?: ESPNEvent[];
};

type Team = {
  id?: string;
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

type NormalizedGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  period: number;
  remaining: number | null;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string; // "East" | "West" | "Finals" | ""
  seriesRound: string;      // "First Round" | "Second Round" | "Conf Finals" | "NBA Finals" | ""
  home: Team;
  away: Team;
  periodScores: {
    away: number[];
    home: number[];
  };
  broadcasts: string[];
  line: GameLine | null;
  leaders: GameLeader[];
  teamComparison: TeamComparisonStat[];
};

type GameLine = {
  spread?: string;
  total?: string;
};

type GameLeader = {
  label: string;
  name: string;
  team: string;
  value: string;
  detail?: string;
};

type TeamComparisonStat = {
  label: string;
  away: string;
  home: string;
};

// Prefix strings to strip from playoff game context headlines
const PLAYOFF_HEADLINE_PREFIXES = [
  "Eastern Conference First Round - ",
  "Western Conference First Round - ",
  "Eastern Conference Second Round - ",
  "Western Conference Second Round - ",
  "Eastern Conference Semifinals - ",
  "Western Conference Semifinals - ",
  "Eastern Conference Finals - ",
  "Western Conference Finals - ",
  "NBA Finals - ",
  "East 1st Round - ",
  "West 1st Round - ",
  "East 2nd Round - ",
  "West 2nd Round - ",
  "East Semifinals - ",
  "West Semifinals - ",
  "East Finals - ",
  "West Finals - ",
];

const ESPN_FETCH_TIMEOUT_MS = 8000;

function getMonday(date: Date) {
  const localDate = new Date(date);
  const day = localDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  localDate.setDate(localDate.getDate() + diff);
  localDate.setHours(0, 0, 0, 0);

  return localDate;
}

function formatDateForESPN(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getScoreboardToday() {
  const now = new Date();
  const scoreboardToday = new Date(now);

  if (now.getHours() < 5) {
    scoreboardToday.setDate(scoreboardToday.getDate() - 1);
  }

  return scoreboardToday;
}

function getWeekDates() {
  const monday = getMonday(getScoreboardToday());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return formatDateForESPN(date);
  });
}

function getDateWindow(startOffset: number, endOffset: number) {
  const today = getScoreboardToday();
  const dates: string[] = [];

  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    dates.push(formatDateForESPN(date));
  }

  return dates;
}

function getSeriesDates() {
  // The score feed stays focused on the current week, but the Series Board needs
  // recent finals too so completed playoff matchups do not vanish on Monday.
  return getDateWindow(-14, 7);
}

function getGameStatus(status?: ESPNStatus): "live" | "upcoming" | "final" {
  const state = status?.type?.state;
  const completed = status?.type?.completed;

  if (completed || state === "post") return "final";
  if (state === "in") return "live";

  return "upcoming";
}

function formatLiveStatus({
  period,
  displayClock,
  description,
  detail,
  shortDetail,
}: {
  period: number;
  displayClock: string;
  description?: string;
  detail?: string;
  shortDetail?: string;
}) {
  const statusText = `${description ?? ""} ${detail ?? ""} ${shortDetail ?? ""}`.toLowerCase();
  const clock = displayClock?.trim();

  if (statusText.includes("halftime")) return "End Q2";

  // End-of-quarter detection
  if (clock === "0.0" || clock === "0:00") {
    if (period >= 1 && period <= 4) return `End Q${period}`;
  }

  if (period > 4) {
    const otNumber = period - 4;
    return otNumber === 1 ? `OT · ${clock}` : `${otNumber}OT · ${clock}`;
  }

  if (!period || !clock) return "Live";

  return `Q${period} · ${clock}`;
}

function formatStatusText(
  status: ESPNStatus | undefined,
  gameStatus: NormalizedGame["status"]
) {
  if (gameStatus === "upcoming") return "Upcoming";
  if (gameStatus === "final") return "Final";

  return formatLiveStatus({
    period: status?.period ?? 0,
    displayClock: status?.displayClock ?? "",
    description: status?.type?.description,
    detail: status?.type?.detail,
    shortDetail: status?.type?.shortDetail,
  });
}

function extractSeriesInfo(context?: string): {
  seriesConference: string;
  seriesRound: string;
} {
  if (!context) return { seriesConference: "", seriesRound: "" };
  const h = context.toLowerCase();

  if (/nba finals/i.test(h)) {
    return { seriesConference: "Finals", seriesRound: "NBA Finals" };
  }
  if (/\b(eastern conference finals|eastern conf finals|east finals|east conf finals)\b/i.test(h)) {
    return { seriesConference: "East", seriesRound: "Conf Finals" };
  }
  if (/\b(western conference finals|western conf finals|west finals|west conf finals)\b/i.test(h)) {
    return { seriesConference: "West", seriesRound: "Conf Finals" };
  }
  if (/(eastern|east).*(semifinals|semi-finals|second round|2nd round)/i.test(h)) {
    return { seriesConference: "East", seriesRound: "Second Round" };
  }
  if (/(western|west).*(semifinals|semi-finals|second round|2nd round)/i.test(h)) {
    return { seriesConference: "West", seriesRound: "Second Round" };
  }
  if (/(eastern|east).*(first round|1st round)/i.test(h)) {
    return { seriesConference: "East", seriesRound: "First Round" };
  }
  if (/(western|west).*(first round|1st round)/i.test(h)) {
    return { seriesConference: "West", seriesRound: "First Round" };
  }

  return { seriesConference: "", seriesRound: "" };
}

// FIX: Removed the no-op `.replace("Game", "Game")` line
function cleanGameContext(headline?: string) {
  if (!headline) return "";

  let cleaned = headline;

  for (const prefix of PLAYOFF_HEADLINE_PREFIXES) {
    cleaned = cleaned.replace(prefix, "");
  }

  return cleaned
    .replace(
      /^(Eastern|Western) Conference (First Round|Second Round|Semifinals|Semi-Finals|Conference Finals|Finals)\s*-\s*/i,
      ""
    )
    .replace(
      /^(East|West) (1st Round|First Round|2nd Round|Second Round|Semifinals|Semi-Finals|Conf Finals|Finals)\s*-\s*/i,
      ""
    )
    .replace(/^NBA Finals\s*-\s*/i, "")
    .replace("If Necessary", "if necessary")
    .trim();
}

function normalizeSeriesSummary(summary?: string) {
  if (!summary) return "";

  return summary
    .replace("lead series", "leads series")
    .replace("Lead series", "Leads series")
    .toUpperCase();
}

// ESPN abbreviation → app-canonical abbreviation. The app's team
// directory (app/companion/following/data/teams.ts) uses canonical NBA
// abbreviations ("NYK" for Knicks, "NOP" wouldn't apply here, etc.).
// ESPN's scoreboard endpoint occasionally returns a shorter variant
// ("NY") that doesn't match the directory, which silently breaks the
// push reverse index — events come in with "NY", subs are indexed under
// "NYK", `listSubscriptionsByTeams(["NY"])` returns empty, dispatcher
// fans out to nobody.
//
// We normalize at this single boundary so every downstream consumer
// (cron detector, dispatcher, UI matchups, share cards) sees one
// consistent code per team. Only add an entry here when an ESPN code
// does NOT match the directory — most teams already line up.
const TEAM_ABBR_ALIASES: Record<string, string> = {
  NY: "NYK",
};

function canonicalAbbreviation(raw: string | undefined): string {
  const upper = (raw ?? "").toUpperCase();
  if (!upper) return "TBD";
  return TEAM_ABBR_ALIASES[upper] ?? upper;
}

function normalizeTeam(competitor?: ESPNCompetitor): Team {
  const team = competitor?.team;

  return {
    id: team?.id ?? competitor?.id,
    name: team?.displayName ?? team?.shortDisplayName ?? "Team",
    abbreviation: canonicalAbbreviation(team?.abbreviation),
    score: Number(competitor?.score ?? 0),
    logo: team?.logos?.[0]?.href ?? team?.logo ?? "",
  };
}

function normalizeLineScores(competitor?: ESPNCompetitor): number[] {
  return (competitor?.linescores ?? [])
    .map((score) => Number(score.value ?? score.displayValue ?? 0))
    .filter((score) => Number.isFinite(score));
}

// DESIGN.md: never render raw broadcast IDs. Pick one friendly label per
// broadcast and reject numeric-only / overly-long strings.
function normalizeBroadcasts(competition: ESPNCompetition): string[] {
  const labels = (competition.broadcasts ?? [])
    .map((broadcast) => {
      const candidates = [
        broadcast.names?.[0],
        broadcast.media?.shortName,
        broadcast.media?.name,
      ];
      for (const candidate of candidates) {
        const value = candidate?.trim();
        if (!value) continue;
        if (/^\d+$/.test(value)) continue;
        if (value.length > 24) continue;
        return value;
      }
      return undefined;
    })
    .filter((label): label is string => Boolean(label));

  return Array.from(new Set(labels)).slice(0, 2);
}

function normalizeLine(competition: ESPNCompetition): GameLine | null {
  const odds = competition.odds?.find(
    (item) => item.details || typeof item.overUnder === "number"
  );

  if (!odds) return null;

  const line = {
    spread: odds.details?.trim(),
    total:
      typeof odds.overUnder === "number"
        ? `O/U ${odds.overUnder.toFixed(odds.overUnder % 1 === 0 ? 0 : 1)}`
        : undefined,
  };

  if (!line.spread && !line.total) return null;
  return line;
}

const TEAM_STAT_GROUPS = [
  { label: "PPG", names: ["avgPoints"] },
  { label: "Opp PPG", names: ["avgPointsAgainst"] },
  { label: "FG%", names: ["fieldGoalPct"] },
  { label: "3P%", names: ["threePointFieldGoalPct", "threePointPct"] },
  { label: "REB", names: ["avgRebounds"] },
  { label: "AST", names: ["avgAssists"] },
];

function findStatValue(competitor: ESPNCompetitor | undefined, names: string[]) {
  const stat = competitor?.statistics?.find((item) =>
    names.includes(item.name ?? "")
  );

  return stat?.displayValue?.trim() ?? "";
}

function normalizeTeamComparison(
  awayCompetitor: ESPNCompetitor | undefined,
  homeCompetitor: ESPNCompetitor | undefined
): TeamComparisonStat[] {
  return TEAM_STAT_GROUPS.map((group) => ({
    label: group.label,
    away: findStatValue(awayCompetitor, group.names),
    home: findStatValue(homeCompetitor, group.names),
  })).filter((row) => row.away && row.home);
}

function normalizeLeaders(competitors: ESPNCompetitor[]): GameLeader[] {
  return competitors.flatMap((competitor) => {
    const teamAbbr = competitor.team?.abbreviation ?? "";
    const interesting = new Set([
      "pointsPerGame",
      "reboundsPerGame",
      "assistsPerGame",
    ]);

    return (competitor.leaders ?? [])
      .filter((group) => interesting.has(group.name ?? ""))
      .flatMap((group) =>
        (group.leaders ?? []).slice(0, 1).map((leader) => ({
          label: group.abbreviation ?? group.shortDisplayName ?? group.displayName ?? "",
          name:
            leader.athlete?.shortName ??
            leader.athlete?.displayName ??
            "Player",
          team: teamAbbr,
          value: leader.displayValue ?? "",
        }))
      );
  }).filter((leader) => leader.label && leader.value).slice(0, 6);
}

function normalizeGame(event: ESPNEvent): NormalizedGame | null {
  const competition = event.competitions?.[0];

  if (!competition) return null;

  const status = competition.status ?? event.status;
  const gameStatus = getGameStatus(status);

  const competitors = competition.competitors ?? [];
  const homeCompetitor = competitors.find((c) => c.homeAway === "home");
  const awayCompetitor = competitors.find((c) => c.homeAway === "away");

  if (!homeCompetitor || !awayCompetitor) return null;

  const home = normalizeTeam(homeCompetitor);
  const away = normalizeTeam(awayCompetitor);
  const rawHeadline = competition.notes?.find((note) => note.headline)?.headline;
  const seriesTitle = competition.series?.title;
  const seriesContext = [
    rawHeadline,
    seriesTitle,
    competition.series?.summary,
    event.name,
    event.shortName,
  ]
    .filter(Boolean)
    .join(" · ");
  const gameContext = cleanGameContext(rawHeadline ?? seriesTitle);
  const { seriesConference, seriesRound } = extractSeriesInfo(seriesContext);

  return {
    id:
      event.id ??
      competition.id ??
      `${away.abbreviation}-${home.abbreviation}-${event.date}`,
    date: event.date ?? competition.date ?? new Date().toISOString(),
    status: gameStatus,
    statusText: formatStatusText(status, gameStatus),
    period: status?.period ?? 0,
    remaining:
      gameStatus === "live" && typeof status?.clock === "number"
        ? Math.max(0, Math.round(status.clock))
        : null,
    matchup: `${away.abbreviation} @ ${home.abbreviation}`,
    gameContext,
    seriesSummary: normalizeSeriesSummary(competition.series?.summary),
    seriesConference,
    seriesRound,
    home,
    away,
    periodScores: {
      away: normalizeLineScores(awayCompetitor),
      home: normalizeLineScores(homeCompetitor),
    },
    broadcasts: normalizeBroadcasts(competition),
    line: normalizeLine(competition),
    leaders: normalizeLeaders(competitors),
    teamComparison: normalizeTeamComparison(awayCompetitor, homeCompetitor),
  };
}

async function fetchGamesForDate(date: string) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ESPN scoreboard for ${date}`);
    }

    const data = (await response.json()) as ESPNScoreboardResponse;

    return data.events ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const weekDates = getWeekDates();
    const seriesDates = getSeriesDates();
    const weekDateSet = new Set(weekDates);
    const fetchDates = Array.from(new Set([...weekDates, ...seriesDates]));

    const eventResults = await Promise.allSettled(
      fetchDates.map((date) => fetchGamesForDate(date))
    );

    const failedDates: string[] = [];
    const gamesById = new Map<string, NormalizedGame>();
    const seriesGamesById = new Map<string, NormalizedGame>();

    eventResults.forEach((result, index) => {
      const date = fetchDates[index];

      if (result.status === "rejected") {
        failedDates.push(date);
        console.warn(`Unable to fetch ESPN scoreboard for ${date}:`, result.reason);
        return;
      }

      result.value.forEach((event) => {
        const game = normalizeGame(event);
        if (!game) return;

        seriesGamesById.set(game.id, game);
        if (weekDateSet.has(date)) gamesById.set(game.id, game);
      });
    });

    const games = Array.from(gamesById.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const seriesGames = Array.from(seriesGamesById.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json(
      {
        games,
        seriesGames,
        count: games.length,
        seriesCount: seriesGames.length,
        week: weekDates,
        seriesWindow: {
          start: seriesDates[0],
          end: seriesDates[seriesDates.length - 1],
        },
        failedDates,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("NBA live scores API error:", error);

    return NextResponse.json(
      {
        games: [],
        count: 0,
        error: "Unable to fetch live scores",
        updatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
