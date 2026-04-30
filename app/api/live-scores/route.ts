const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

type ESPNCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team?: {
    displayName?: string;
    abbreviation?: string;
  };
};

type ESPNEvent = {
  id: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: {
    displayClock?: string;
    period?: number;
    type?: {
      name?: string;
      state?: "pre" | "in" | "post";
      completed?: boolean;
      shortDetail?: string;
      detail?: string;
      description?: string;
    };
  };
  competitions?: {
    competitors?: ESPNCompetitor[];
  }[];
};

type NormalizedGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  matchup: string;
  home: {
    name: string;
    abbreviation: string;
    score: number;
  };
  away: {
    name: string;
    abbreviation: string;
    score: number;
  };
};

function formatDateForESPN(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getWeekDates() {
  const today = new Date();

  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();

  // JavaScript uses Sunday = 0, Monday = 1, Tuesday = 2, etc.
  // This makes Monday the start of the week.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  startOfWeek.setDate(today.getDate() - daysSinceMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });
}

function getTeam(event: ESPNEvent, homeAway: "home" | "away") {
  const competition = event.competitions?.[0];

  const competitor = competition?.competitors?.find(
    (team) => team.homeAway === homeAway
  );

  return {
    name: competitor?.team?.displayName || "TBD",
    abbreviation: competitor?.team?.abbreviation || "TBD",
    score: Number(competitor?.score || 0),
  };
}

function getGameStatus(event: ESPNEvent) {
  const status = event.status?.type;
  const state = status?.state;
  const name = status?.name;

  if (state === "in" || name === "STATUS_IN_PROGRESS") {
    return "live";
  }

  if (state === "post" || status?.completed || name?.includes("FINAL")) {
    return "final";
  }

  return "upcoming";
}

function getStatusText(event: ESPNEvent) {
  const gameStatus = getGameStatus(event);
  const period = event.status?.period ? `Q${event.status.period}` : "";
  const clock = event.status?.displayClock || "";

  if (gameStatus === "live") {
    if (period && clock) return `${period} · ${clock}`;
    return event.status?.type?.shortDetail || "Live";
  }

  if (gameStatus === "final") {
    return event.status?.type?.shortDetail || "Final";
  }

  if (event.date) {
    return new Date(event.date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return event.status?.type?.shortDetail || "Upcoming";
}

function normalizeGame(event: ESPNEvent): NormalizedGame {
  return {
    id: event.id,
    date: event.date || "",
    status: getGameStatus(event),
    statusText: getStatusText(event),
    matchup: event.shortName || event.name || "",
    home: getTeam(event, "home"),
    away: getTeam(event, "away"),
  };
}

function sortGames(games: NormalizedGame[]) {
  const statusRank = {
    live: 0,
    upcoming: 1,
    final: 2,
  };

  return games.sort((a, b) => {
    const statusDifference = statusRank[a.status] - statusRank[b.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();

    // Live and upcoming games: soonest first.
    if (a.status === "live" || a.status === "upcoming") {
      return aTime - bTime;
    }

    // Final games: most recent first.
    return bTime - aTime;
  });
}

export async function GET() {
  try {
    const weekDates = getWeekDates();

    const responses = await Promise.all(
      weekDates.map((date) => {
        const espnDate = formatDateForESPN(date);

        return fetch(`${ESPN_SCOREBOARD_URL}?dates=${espnDate}`, {
          next: {
            revalidate: 30,
          },
        });
      })
    );

    const payloads = await Promise.all(
      responses.map(async (response) => {
        if (!response.ok) return { events: [] };
        return response.json();
      })
    );

    const games = payloads
      .flatMap((payload) => payload.events || [])
      .map(normalizeGame);

    return Response.json({
      games: sortGames(games),
      week: weekDates.map(formatDateForESPN),
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { error: "Score service unavailable", games: [] },
      { status: 500 }
    );
  }
}