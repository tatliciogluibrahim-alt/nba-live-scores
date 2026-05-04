import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

// ESPN uses "fifa.world" for the World Cup tournament
const WC_LEAGUE = "fifa.world";

type ESPNTeam = {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  logo?: string;
  logos?: { href?: string }[];
  flag?: { href?: string };
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

type ESPNEvent = {
  id?: string;
  name?: string;
  date?: string;
  status?: ESPNStatus;
  competitions?: {
    id?: string;
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    notes?: { type?: string; headline?: string }[];
    groups?: { name?: string; shortName?: string };
    tournament?: { id?: string; displayName?: string };
  }[];
};

type ESPNScoreboardResponse = {
  events?: ESPNEvent[];
  season?: { year?: number; type?: number; slug?: string };
};

export type WCTeam = {
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

export type WCGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string; // "Group A", "Round of 32", "Quarterfinal", etc.
  venue?: string;
  home: WCTeam;
  away: WCTeam;
};

function getGameStatus(
  status?: ESPNStatus
): WCGame["status"] {
  const state = status?.type?.state;
  const completed = status?.type?.completed;
  if (completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

function formatSoccerStatus(status?: ESPNStatus, gameStatus?: WCGame["status"]): string {
  if (gameStatus === "final") return "FT";
  if (gameStatus === "upcoming") return "Upcoming";

  const desc = status?.type?.description ?? "";
  const detail = status?.type?.detail ?? status?.type?.shortDetail ?? "";
  const lower = (desc + " " + detail).toLowerCase();

  if (lower.includes("halftime") || lower.includes("half time")) return "HT";
  if (lower.includes("extra time") || lower.includes("et")) return `ET · ${status?.displayClock ?? ""}`.trim();
  if (lower.includes("penalty") || lower.includes("pso")) return "PEN";

  const clock = status?.displayClock?.trim() ?? "";
  if (clock) return clock + "'";
  return "Live";
}

function normalizeTeam(competitor?: ESPNCompetitor): WCTeam {
  const team = competitor?.team;
  return {
    name: team?.displayName ?? team?.shortDisplayName ?? "TBD",
    abbreviation: team?.abbreviation ?? "TBD",
    score: Number(competitor?.score ?? 0),
    logo:
      team?.flag?.href ??
      team?.logos?.[0]?.href ??
      team?.logo ??
      "",
  };
}

function normalizeEvent(event: ESPNEvent): WCGame | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const status = competition.status ?? event.status;
  const gameStatus = getGameStatus(status);

  const competitors = competition.competitors ?? [];
  const home = normalizeTeam(competitors.find((c) => c.homeAway === "home"));
  const away = normalizeTeam(competitors.find((c) => c.homeAway === "away"));

  const stage =
    competition.groups?.shortName ??
    competition.groups?.name ??
    competition.notes?.[0]?.headline ??
    "";

  return {
    id: event.id ?? `${away.abbreviation}-${home.abbreviation}-${event.date}`,
    date: event.date ?? competition.date ?? new Date().toISOString(),
    status: gameStatus,
    statusText: formatSoccerStatus(status, gameStatus),
    stage,
    home,
    away,
  };
}

function formatDateForESPN(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Returns today + the next 6 days */
function getDateWindow(): string[] {
  const today = new Date();
  if (today.getHours() < 5) today.setDate(today.getDate() - 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return formatDateForESPN(d);
  });
}

async function fetchForDate(date: string): Promise<ESPNEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${WC_LEAGUE}/scoreboard?dates=${date}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ESPNScoreboardResponse;
    return data.events ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  try {
    const dates = getDateWindow();
    const results = await Promise.allSettled(dates.map(fetchForDate));

    const events = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    const byId = new Map<string, WCGame>();
    events.forEach((e) => {
      const g = normalizeEvent(e);
      if (g) byId.set(g.id, g);
    });

    const games = Array.from(byId.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json(
      { games, count: games.length, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("World Cup API error:", err);
    return NextResponse.json(
      { games: [], count: 0, error: "Unable to fetch", updatedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
