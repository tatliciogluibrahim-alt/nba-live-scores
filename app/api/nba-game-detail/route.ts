import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

type ESPNStat = {
  name?: string;
  label?: string;
  abbreviation?: string;
  displayValue?: string;
};

type ESPNTeam = {
  abbreviation?: string;
  displayName?: string;
};

type ESPNBoxscoreTeam = {
  team?: ESPNTeam;
  statistics?: ESPNStat[];
};

type ESPNLeaderItem = {
  displayValue?: string;
  summary?: string;
  athlete?: {
    displayName?: string;
    shortName?: string;
  };
  mainStat?: {
    value?: string;
    label?: string;
  };
};

type ESPNLeaderCategory = {
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  leaders?: ESPNLeaderItem[];
};

type ESPNTeamLeaders = {
  team?: ESPNTeam;
  leaders?: ESPNLeaderCategory[];
};

type ESPNBroadcast = {
  names?: string[];
  station?: string;
  media?: {
    shortName?: string;
    name?: string;
    callLetters?: string;
  };
};

type ESPNOdds = {
  details?: string;
  overUnder?: number;
};

type ESPNCompetition = {
  broadcasts?: ESPNBroadcast[];
  odds?: ESPNOdds[];
};

type ESPNSummaryResponse = {
  boxscore?: {
    teams?: ESPNBoxscoreTeam[];
  };
  leaders?: ESPNTeamLeaders[];
  broadcasts?: ESPNBroadcast[];
  odds?: ESPNOdds[];
  header?: {
    competitions?: ESPNCompetition[];
  };
};

const TEAM_STAT_GROUPS = [
  { label: "PPG", names: ["avgPoints"] },
  { label: "Opp PPG", names: ["avgPointsAgainst"] },
  { label: "FG%", names: ["fieldGoalPct"] },
  { label: "3P%", names: ["threePointFieldGoalPct", "threePointPct"] },
  { label: "REB", names: ["avgRebounds"] },
  { label: "AST", names: ["avgAssists"] },
];

function cleanNames(names: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      names
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
}

function normalizeBroadcasts(data: ESPNSummaryResponse): string[] {
  const headerBroadcasts = data.header?.competitions?.flatMap(
    (competition) => competition.broadcasts ?? []
  ) ?? [];

  const broadcasts = [...headerBroadcasts, ...(data.broadcasts ?? [])];

  return cleanNames(
    broadcasts.flatMap((broadcast) => [
      ...(broadcast.names ?? []),
      broadcast.station,
      broadcast.media?.shortName,
      broadcast.media?.callLetters,
      broadcast.media?.name,
    ])
  ).slice(0, 4);
}

function normalizeLine(data: ESPNSummaryResponse) {
  const headerOdds = data.header?.competitions?.flatMap(
    (competition) => competition.odds ?? []
  ) ?? [];

  const odds = [...headerOdds, ...(data.odds ?? [])].find(
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

function findStatValue(team: ESPNBoxscoreTeam | undefined, names: string[]) {
  const stat = team?.statistics?.find((item) => names.includes(item.name ?? ""));
  return stat?.displayValue?.trim() ?? "";
}

function normalizeTeamComparison(data: ESPNSummaryResponse) {
  const teams = data.boxscore?.teams ?? [];
  const away = teams[0];
  const home = teams[1];

  if (!away || !home) return [];

  return TEAM_STAT_GROUPS.map((group) => ({
    label: group.label,
    away: findStatValue(away, group.names),
    home: findStatValue(home, group.names),
  })).filter((row) => row.away && row.home);
}

function normalizeLeaders(data: ESPNSummaryResponse) {
  const interesting = new Set([
    "pointsPerGame",
    "assistsPerGame",
    "reboundsPerGame",
    "stealsPerGame",
    "blocksPerGame",
  ]);

  return (data.leaders ?? [])
    .flatMap((teamLeaders) => {
      const team = teamLeaders.team?.abbreviation ?? "";

      return (teamLeaders.leaders ?? [])
        .filter((category) => interesting.has(category.name ?? ""))
        .flatMap((category) =>
          (category.leaders ?? []).slice(0, 1).map((leader) => ({
            label:
              leader.mainStat?.label ??
              category.abbreviation ??
              category.shortDisplayName ??
              category.displayName ??
              "",
            name:
              leader.athlete?.shortName ??
              leader.athlete?.displayName ??
              "Player",
            team,
            value: leader.mainStat?.value ?? leader.displayValue ?? "",
            detail: leader.summary,
          }))
        );
    })
    .filter((leader) => leader.label && leader.value)
    .slice(0, 8);
}

export async function GET(request: NextRequest) {
  const event = request.nextUrl.searchParams.get("event");

  if (!event) {
    return NextResponse.json(
      {
        broadcasts: [],
        line: null,
        leaders: [],
        teamComparison: [],
        error: "Missing event id",
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(event)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch NBA summary for ${event}`);
    }

    const data = (await response.json()) as ESPNSummaryResponse;

    return NextResponse.json(
      {
        broadcasts: normalizeBroadcasts(data),
        line: normalizeLine(data),
        leaders: normalizeLeaders(data),
        teamComparison: normalizeTeamComparison(data),
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("NBA game detail API error:", error);

    return NextResponse.json(
      {
        broadcasts: [],
        line: null,
        leaders: [],
        teamComparison: [],
        error: "Unable to fetch game detail",
        updatedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } finally {
    clearTimeout(timeout);
  }
}
