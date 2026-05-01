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
  homeAway?: "home" | "away";
  score?: string;
  team?: ESPNTeam;
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

type ESPNCompetition = {
  id?: string;
  date?: string;
  status?: ESPNStatus;
  competitors?: ESPNCompetitor[];
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
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  home: Team;
  away: Team;
};

// Prefix strings to strip from playoff game context headlines
const PLAYOFF_HEADLINE_PREFIXES = [
  "Eastern Conference First Round - ",
  "Western Conference First Round - ",
  "East 1st Round - ",
  "West 1st Round - ",
];

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

// FIX: Removed the no-op `.replace("Game", "Game")` line
function cleanGameContext(headline?: string) {
  if (!headline) return "";

  let cleaned = headline;

  for (const prefix of PLAYOFF_HEADLINE_PREFIXES) {
    cleaned = cleaned.replace(prefix, "");
  }

  return cleaned
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

function normalizeTeam(competitor?: ESPNCompetitor): Team {
  const team = competitor?.team;

  return {
    name: team?.displayName ?? team?.shortDisplayName ?? "Team",
    abbreviation: team?.abbreviation ?? "TBD",
    score: Number(competitor?.score ?? 0),
    logo: team?.logos?.[0]?.href ?? team?.logo ?? "",
  };
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
  const gameContext = cleanGameContext(competition.notes?.[0]?.headline);

  return {
    id:
      event.id ??
      competition.id ??
      `${away.abbreviation}-${home.abbreviation}-${event.date}`,
    date: event.date ?? competition.date ?? new Date().toISOString(),
    status: gameStatus,
    statusText: formatStatusText(status, gameStatus),
    matchup: `${away.abbreviation} @ ${home.abbreviation}`,
    gameContext,
    seriesSummary: normalizeSeriesSummary(competition.series?.summary),
    home,
    away,
  };
}

async function fetchGamesForDate(date: string) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ESPN scoreboard for ${date}`);
  }

  const data = (await response.json()) as ESPNScoreboardResponse;

  return data.events ?? [];
}

export async function GET() {
  try {
    const weekDates = getWeekDates();

    const eventGroups = await Promise.all(
      weekDates.map((date) => fetchGamesForDate(date))
    );

    const events = eventGroups.flat();
    const gamesById = new Map<string, NormalizedGame>();

    events.forEach((event) => {
      const game = normalizeGame(event);
      if (game) gamesById.set(game.id, game);
    });

    const games = Array.from(gamesById.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json(
      { games, count: games.length, week: weekDates, updatedAt: new Date().toISOString() },
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
