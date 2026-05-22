import { NextResponse } from "next/server";
import type { Game, GameLine, GamePlay, PeriodScores, Team } from "../../nba/types";
import {
  buildLiveGameState,
  getMomentumFromPlays,
} from "../../nba/lib/live-state";

export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

type ESPNStatus = {
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

type ESPNCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
    logo?: string;
    logos?: { href?: string }[];
  };
  linescores?: { value?: number; displayValue?: string }[];
};

type ESPNCompetition = {
  id?: string;
  date?: string;
  status?: ESPNStatus;
  competitors?: ESPNCompetitor[];
  broadcasts?: { names?: string[]; media?: { shortName?: string; name?: string } }[];
  odds?: { details?: string; overUnder?: number }[];
  notes?: { headline?: string }[];
  series?: { title?: string; summary?: string };
};

type ESPNEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: ESPNStatus;
  competitions?: ESPNCompetition[];
};

type ESPNScoreboardResponse = {
  events?: ESPNEvent[];
};

type ESPNPlay = {
  id?: string;
  text?: string;
  shortDescription?: string;
  awayScore?: number;
  homeScore?: number;
  scoreValue?: number;
  type?: { text?: string };
  period?: { number?: number };
  clock?: { displayValue?: string };
  team?: { id?: string };
  wallclock?: string;
};

type ESPNSummaryResponse = {
  header?: {
    competitions?: (ESPNCompetition & {
      competitors?: ESPNCompetitor[];
    })[];
  };
  plays?: ESPNPlay[];
};

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

function statusFromESPN(status?: ESPNStatus): Game["status"] {
  if (status?.type?.completed || status?.type?.state === "post") return "final";
  if (status?.type?.state === "in") return "live";
  return "upcoming";
}

function formatStatus(status: ESPNStatus | undefined, gameStatus: Game["status"]) {
  if (gameStatus === "upcoming") return "Upcoming";
  if (gameStatus === "final") return "Final";

  const period = status?.period ?? 0;
  const clock = status?.displayClock?.trim() ?? "";

  if (period > 4) {
    const ot = period - 4;
    return ot === 1 ? `OT · ${clock}` : `${ot}OT · ${clock}`;
  }

  if ((clock === "0.0" || clock === "0:00") && period >= 1 && period <= 4) {
    return `End Q${period}`;
  }

  return period && clock ? `Q${period} · ${clock}` : "Live";
}

function normalizeTeam(competitor?: ESPNCompetitor): Team {
  const team = competitor?.team;

  return {
    id: team?.id ?? competitor?.id,
    name: team?.displayName ?? team?.shortDisplayName ?? "Team",
    abbreviation: team?.abbreviation ?? "TBD",
    score: Number(competitor?.score ?? 0),
    logo: team?.logos?.[0]?.href ?? team?.logo ?? "",
  };
}

function normalizeLineScores(competitor?: ESPNCompetitor) {
  return (competitor?.linescores ?? [])
    .map((score) => Number(score.value ?? score.displayValue ?? 0))
    .filter((score) => Number.isFinite(score));
}

function normalizePeriodScores(away?: ESPNCompetitor, home?: ESPNCompetitor): PeriodScores {
  return {
    away: normalizeLineScores(away),
    home: normalizeLineScores(home),
  };
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

  return line.spread || line.total ? line : null;
}

function normalizeBroadcasts(competition: ESPNCompetition) {
  const names = (competition.broadcasts ?? []).flatMap((broadcast) => [
    ...(broadcast.names ?? []),
    broadcast.media?.shortName,
    broadcast.media?.name,
  ]);

  return Array.from(
    new Set(names.map((name) => name?.trim()).filter((name): name is string => Boolean(name)))
  ).slice(0, 4);
}

function extractSeriesInfo(context: string) {
  const lower = context.toLowerCase();

  if (lower.includes("nba finals")) return { seriesConference: "Finals", seriesRound: "NBA Finals" };
  if (/(east|eastern).*(finals|conf finals|conference finals)/i.test(context)) {
    return { seriesConference: "East", seriesRound: "Conf Finals" };
  }
  if (/(west|western).*(finals|conf finals|conference finals)/i.test(context)) {
    return { seriesConference: "West", seriesRound: "Conf Finals" };
  }
  if (/(east|eastern).*(semifinals|second round|2nd round)/i.test(context)) {
    return { seriesConference: "East", seriesRound: "Second Round" };
  }
  if (/(west|western).*(semifinals|second round|2nd round)/i.test(context)) {
    return { seriesConference: "West", seriesRound: "Second Round" };
  }
  if (/(east|eastern).*(first round|1st round)/i.test(context)) {
    return { seriesConference: "East", seriesRound: "First Round" };
  }
  if (/(west|western).*(first round|1st round)/i.test(context)) {
    return { seriesConference: "West", seriesRound: "First Round" };
  }

  return { seriesConference: "", seriesRound: "" };
}

function normalizeGame(event: ESPNEvent): Game | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const status = competition.status ?? event.status;
  const gameStatus = statusFromESPN(status);
  const competitors = competition.competitors ?? [];
  const awayCompetitor = competitors.find((competitor) => competitor.homeAway === "away");
  const homeCompetitor = competitors.find((competitor) => competitor.homeAway === "home");
  if (!awayCompetitor || !homeCompetitor) return null;

  const away = normalizeTeam(awayCompetitor);
  const home = normalizeTeam(homeCompetitor);
  const rawHeadline = competition.notes?.find((note) => note.headline)?.headline ?? "";
  const context = [
    rawHeadline,
    competition.series?.title,
    competition.series?.summary,
    event.name,
    event.shortName,
  ]
    .filter(Boolean)
    .join(" · ");
  const seriesInfo = extractSeriesInfo(context);

  return {
    id: event.id ?? competition.id ?? `${away.abbreviation}-${home.abbreviation}-${event.date}`,
    date: event.date ?? competition.date ?? new Date().toISOString(),
    status: gameStatus,
    statusText: formatStatus(status, gameStatus),
    period: status?.period ?? 0,
    remaining:
      gameStatus === "live" && typeof status?.clock === "number"
        ? Math.max(0, Math.round(status.clock))
        : null,
    matchup: `${away.abbreviation} @ ${home.abbreviation}`,
    gameContext: rawHeadline.replace(/^(East|West|Eastern|Western|NBA).*?-\s*/i, "").trim(),
    seriesSummary: competition.series?.summary?.toUpperCase() ?? "",
    ...seriesInfo,
    away,
    home,
    periodScores: normalizePeriodScores(awayCompetitor, homeCompetitor),
    broadcasts: normalizeBroadcasts(competition),
    line: normalizeLine(competition),
    leaders: [],
    teamComparison: [],
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
  const competition = data.header?.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const awayId = away?.team?.id ?? away?.id;
  const homeId = home?.team?.id ?? home?.id;
  const awayAbbr = away?.team?.abbreviation ?? "AWAY";
  const homeAbbr = home?.team?.abbreviation ?? "HOME";
  let previousAway = 0;
  let previousHome = 0;

  return (data.plays ?? [])
    .map((play): GamePlay => {
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
        teamAbbreviation: side === "away" ? awayAbbr : side === "home" ? homeAbbr : "NEUT",
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

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const date = formatDateForESPN(getScoreboardToday());
    const scoreboard = await fetchJson<ESPNScoreboardResponse>(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`
    );
    const games = (scoreboard.events ?? [])
      .map(normalizeGame)
      .filter((game): game is Game => Boolean(game))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const liveGames = await Promise.all(
      games
        .filter((game) => game.status === "live")
        .map(async (game) => {
          const summary = await fetchJson<ESPNSummaryResponse>(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(game.id)}`
          );
          const plays = normalizePlays(summary);
          const momentum = getMomentumFromPlays(plays, game);

          return buildLiveGameState({
            game,
            plays,
            momentum,
          });
        })
    );

    return NextResponse.json(
      {
        liveGames,
        upcoming: games.filter((game) => game.status === "upcoming"),
        finals: games.filter((game) => game.status === "final"),
        userTeam: null,
        source: {
          scoreboard:
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          summary:
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary",
        },
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("NBA today contract error:", error);

    return NextResponse.json(
      {
        liveGames: [],
        upcoming: [],
        finals: [],
        userTeam: null,
        error: "Unable to fetch today contract",
        updatedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
