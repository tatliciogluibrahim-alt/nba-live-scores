import { NextRequest, NextResponse } from "next/server";
import type { GamePlay } from "../../nba/types";

export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

type ESPNStat = {
  name?: string;
  label?: string;
  abbreviation?: string;
  displayValue?: string;
};

type ESPNTeam = {
  id?: string;
  abbreviation?: string;
  displayName?: string;
};

type ESPNBoxscoreTeam = {
  team?: ESPNTeam;
  statistics?: ESPNStat[];
};

type ESPNHeaderCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: ESPNTeam;
  linescores?: { value?: number; displayValue?: string }[];
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
  competitors?: ESPNHeaderCompetitor[];
  status?: {
    clock?: number;
    displayClock?: string;
    period?: number;
    type?: {
      state?: string;
      completed?: boolean;
      description?: string;
      detail?: string;
      shortDetail?: string;
    };
  };
  broadcasts?: ESPNBroadcast[];
  odds?: ESPNOdds[];
};

type ESPNPlay = {
  id?: string;
  text?: string;
  shortDescription?: string;
  awayScore?: number;
  homeScore?: number;
  scoreValue?: number;
  scoringPlay?: boolean;
  type?: {
    text?: string;
  };
  period?: {
    number?: number;
    displayValue?: string;
  };
  clock?: {
    displayValue?: string;
  };
  team?: {
    id?: string;
  };
  wallclock?: string;
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
  plays?: ESPNPlay[];
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

// DESIGN.md: never render raw broadcast IDs. A broadcast carries multiple
// fields (names, station call-letters, media.shortName/name, numeric IDs).
// Pick the friendliest single label per broadcast and drop ID-shaped strings.
function pickFriendlyBroadcastLabel(broadcast: ESPNBroadcast): string | undefined {
  const candidates = [
    broadcast.names?.[0],
    broadcast.media?.shortName,
    broadcast.media?.name,
    broadcast.station,
    broadcast.media?.callLetters,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    // Skip numeric-only IDs and overly-long strings (likely garbage).
    if (/^\d+$/.test(value)) continue;
    if (value.length > 24) continue;
    return value;
  }
  return undefined;
}

function normalizeBroadcasts(data: ESPNSummaryResponse): string[] {
  const headerBroadcasts = data.header?.competitions?.flatMap(
    (competition) => competition.broadcasts ?? []
  ) ?? [];
  const broadcasts = [...headerBroadcasts, ...(data.broadcasts ?? [])];

  return cleanNames(broadcasts.map(pickFriendlyBroadcastLabel)).slice(0, 2);
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

function normalizePeriodScores(data: ESPNSummaryResponse) {
  const competitors = data.header?.competitions?.[0]?.competitors ?? [];
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const toScores = (competitor: ESPNHeaderCompetitor | undefined) =>
    (competitor?.linescores ?? [])
      .map((score) => Number(score.value ?? score.displayValue ?? 0))
      .filter((score) => Number.isFinite(score));

  return {
    away: toScores(away),
    home: toScores(home),
  };
}

function classifyPlayKind(play: ESPNPlay) {
  const raw = `${play.type?.text ?? ""} ${play.shortDescription ?? ""} ${play.text ?? ""}`.toLowerCase();

  if (raw.includes("3pt") || raw.includes("three point")) return "3PT";
  if (raw.includes("free throw")) return "FT";
  if (raw.includes("dunk")) return "DUNK";
  if (raw.includes("steal")) return "STEAL";
  if (raw.includes("block")) return "BLOCK";
  if (raw.includes("foul")) return "FOUL";
  if (raw.includes("timeout")) return "TIMEOUT";
  if (raw.includes("assist")) return "AST";
  if (play.scoreValue && play.scoreValue > 0) return "2PT";

  return play.type?.text ?? "PLAY";
}

function normalizePlays(data: ESPNSummaryResponse) {
  const competitors = data.header?.competitions?.[0]?.competitors ?? [];
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const awayId = away?.team?.id ?? away?.id;
  const homeId = home?.team?.id ?? home?.id;
  const awayAbbr = away?.team?.abbreviation ?? "AWAY";
  const homeAbbr = home?.team?.abbreviation ?? "HOME";
  let previousAway = 0;
  let previousHome = 0;

  return (data.plays ?? [])
    .map((play) => {
      const awayScore = Number(play.awayScore ?? previousAway);
      const homeScore = Number(play.homeScore ?? previousHome);
      const teamId = play.team?.id;
      const side: GamePlay["team"] =
        teamId && teamId === awayId
          ? "away"
          : teamId && teamId === homeId
            ? "home"
            : "neutral";
      const normalized = {
        id: play.id ?? `${play.period?.number ?? 0}-${play.clock?.displayValue ?? ""}-${play.text ?? ""}`,
        t: play.clock?.displayValue ?? "",
        team: side,
        // Neutral plays carry an empty team string — render layer humanizes
        // them ("Timeout", "Foul", "End of Q4"). DESIGN.md forbids "NEUT".
        teamAbbreviation:
          side === "away" ? awayAbbr : side === "home" ? homeAbbr : "",
        who: play.shortDescription ?? play.type?.text ?? "Play",
        kind: classifyPlayKind(play),
        pts: Math.max(0, Number(play.scoreValue ?? 0)),
        delta: {
          away: awayScore - previousAway,
          home: homeScore - previousHome,
        },
        score: `${awayAbbr} ${awayScore} · ${homeAbbr} ${homeScore}`,
        text: play.text ?? play.shortDescription ?? "",
        period: play.period?.number ?? 0,
        wallclock: play.wallclock,
      };

      previousAway = awayScore;
      previousHome = homeScore;
      return normalized;
    })
    .filter((play) => play.text || play.kind)
    .reverse()
    .slice(0, 12);
}

function normalizeMomentum(plays: ReturnType<typeof normalizePlays>) {
  let current = 0;
  const chronological = [...plays].reverse();

  return chronological
    .map((play) => {
      current = current * 0.85 + play.delta.home - play.delta.away;
      return Number(current.toFixed(1));
    })
    .slice(-40);
}

function computePulse(data: ESPNSummaryResponse) {
  const competition = data.header?.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const status = competition?.status;
  const isLive = status?.type?.state === "in" && !status.type?.completed;

  if (!isLive) return null;

  const diff = Math.abs(Number(home?.score ?? 0) - Number(away?.score ?? 0));
  const close = Math.max(0, 1 - diff / 15);
  const late =
    (status?.period ?? 0) >= 4 && typeof status?.clock === "number"
      ? Math.max(0, 1 - status.clock / 180)
      : 0;
  const heat = Math.max(0, Math.min(1, close * 0.55 + late * 0.45));
  const label =
    heat > 0.85
      ? "CHAOS"
      : heat > 0.65
        ? "FINAL WINDOW"
        : heat > 0.45
          ? "HIGH PULSE"
          : heat > 0.2
            ? "HEATING UP"
            : "CALM";

  return { label, heat };
}

export async function GET(request: NextRequest) {
  // Accept both `?event=` (browser callers: game-detail-drawer, use-nba-detail)
  // and `?id=` (the scan-nba cron). They drifted apart and the cron's
  // `?id=` silently hit the 400 branch below, so the player-milestone
  // highlight path (30/40/50/60 PTS) never received leaders and never
  // fired. Tolerating either param name fixes the cron without touching
  // the working browser paths, and guards against future caller drift.
  const event =
    request.nextUrl.searchParams.get("event") ??
    request.nextUrl.searchParams.get("id");

  if (!event) {
    return NextResponse.json(
      {
        broadcasts: [],
        line: null,
        leaders: [],
        teamComparison: [],
        periodScores: { away: [], home: [] },
        plays: [],
        momentum: [],
        pulse: null,
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
    const plays = normalizePlays(data);

    return NextResponse.json(
      {
        broadcasts: normalizeBroadcasts(data),
        line: normalizeLine(data),
        leaders: normalizeLeaders(data),
        teamComparison: normalizeTeamComparison(data),
        periodScores: normalizePeriodScores(data),
        plays,
        momentum: normalizeMomentum(plays),
        pulse: computePulse(data),
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
        periodScores: { away: [], home: [] },
        plays: [],
        momentum: [],
        pulse: null,
        error: "Unable to fetch game detail",
        updatedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } finally {
    clearTimeout(timeout);
  }
}
