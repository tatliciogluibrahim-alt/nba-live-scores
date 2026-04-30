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
  status?: {
    displayClock?: string;
    period?: number;
    type?: {
      name?: string;
      shortDetail?: string;
      detail?: string;
    };
  };
  competitions?: {
    competitors?: ESPNCompetitor[];
  }[];
};

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

function isLiveGame(event: ESPNEvent) {
  return event.status?.type?.name === "STATUS_IN_PROGRESS";
}

function normalizeGame(event: ESPNEvent) {
  const period = event.status?.period ? `Q${event.status.period}` : "Live";
  const clock = event.status?.displayClock || "";
  const statusText = clock ? `${period} · ${clock}` : period;

  return {
    id: event.id,
    statusText,
    home: getTeam(event, "home"),
    away: getTeam(event, "away"),
  };
}

export async function GET() {
  try {
    const response = await fetch(ESPN_SCOREBOARD_URL, {
      next: {
        revalidate: 10,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Could not fetch scoreboard", games: [] },
        { status: 500 }
      );
    }

    const data = await response.json();

    const games = (data.events || []).filter(isLiveGame).map(normalizeGame);

    return Response.json({
      games,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { error: "Live score service unavailable", games: [] },
      { status: 500 }
    );
  }
}