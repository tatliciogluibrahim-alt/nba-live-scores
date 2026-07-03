import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { WC_LEAGUE } from "../../../lib/wc-league";

export const dynamic = "force-dynamic";

// Full-tournament Summer Soccer schedule + standings, straight from ESPN.
//
// The live endpoint (/api/world-cup) fetches a rolling 14-day window for
// "what's on now" (Today / Watching / push). This one fetches the WHOLE
// tournament in a single date-range scoreboard call, plus the official
// standings, and is the source of truth for the structural surfaces
// (groups page, country page, tournament page). It replaces the curated
// guess in wc-fixtures.ts: real pairings, real dates/times, real scores,
// real group tables — nothing fabricated.
//
// KV-cached briefly so a busy groups page doesn't hammer ESPN; the cache
// degrades to a live fetch when KV isn't configured (local dev).

// Group stage + knockouts. June 11 first whistle → July 19 final.
const WC_DATE_RANGE = "20260611-20260719";
const SCOREBOARD_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/${WC_LEAGUE}/scoreboard?dates=${WC_DATE_RANGE}`;
const STANDINGS_URL = `https://site.api.espn.com/apis/v2/sports/soccer/${WC_LEAGUE}/standings`;

const ESPN_TIMEOUT_MS = 9000;
const CACHE_KEY = "nns:wc:schedule:v2";
const CACHE_TTL_SECONDS = 60; // fresh enough for live scores, light on ESPN

// ── Group map (verified from ESPN standings, June 2026) ────────────────
const TEAM_GROUP: Record<string, string> = {
  MEX: "A", CZE: "A", KOR: "A", RSA: "A",
  CAN: "B", BIH: "B", SUI: "B", QAT: "B",
  BRA: "C", SCO: "C", HAI: "C", MAR: "C",
  PAR: "D", TUR: "D", AUS: "D", USA: "D",
  ECU: "E", GER: "E", CIV: "E", CUW: "E",
  NED: "F", SWE: "F", JPN: "F", TUN: "F",
  BEL: "G", IRN: "G", EGY: "G", NZL: "G",
  ESP: "H", URU: "H", KSA: "H", CPV: "H",
  NOR: "I", FRA: "I", SEN: "I", IRQ: "I",
  ARG: "J", AUT: "J", ALG: "J", JOR: "J",
  COL: "K", POR: "K", UZB: "K", COD: "K",
  ENG: "L", CRO: "L", PAN: "L", GHA: "L",
};

// ── Output shapes ──────────────────────────────────────────────────────

export type WCScheduleFixture = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
  broadcasts: string[];
};

export type WCScheduleStanding = {
  code: string;
  played: number;
  points: number;
  gf: number;
  ga: number;
  gd: number;
  position: number;
};

export type WCSchedulePayload = {
  fixtures: WCScheduleFixture[];
  /** Group letter -> rows ordered by official rank. */
  standings: Record<string, WCScheduleStanding[]>;
  fetchedAt: number;
};

// ── ESPN parsing (lean — only what the structural surfaces need) ───────

type ESPNStatus = {
  displayClock?: string;
  type?: { state?: string; completed?: boolean; description?: string; detail?: string };
};
type ESPNCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
};
type ESPNBroadcast = {
  names?: string[];
  station?: string;
  media?: { shortName?: string; name?: string; callLetters?: string };
};
type ESPNEvent = {
  id?: string;
  date?: string;
  status?: ESPNStatus;
  season?: { slug?: string };
  competitions?: {
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    broadcasts?: ESPNBroadcast[];
    notes?: { headline?: string }[];
  }[];
};

function gameStatus(status: ESPNStatus | undefined): WCScheduleFixture["status"] {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

function soccerStatusText(
  status: ESPNStatus | undefined,
  state: WCScheduleFixture["status"]
): string {
  if (state === "final") {
    const detail = (status?.type?.detail ?? "").toLowerCase();
    if (detail.includes("aet") || detail.includes("extra time")) return "AET";
    if (detail.includes("pen")) return "Pens";
    return "FT";
  }
  if (state === "upcoming") return "Upcoming";
  const desc = ((status?.type?.description ?? "") + " " + (status?.type?.detail ?? "")).toLowerCase();
  const clock = status?.displayClock?.trim() ?? "";
  // Weather / safety delay or suspension — ESPN freezes the clock with
  // state still "in". Surface "Delayed" instead of the stale minute.
  if (desc.includes("delay") || desc.includes("suspend") || desc.includes("postpon"))
    return "Delayed";
  if (desc.includes("halftime") || desc.includes("half time")) return "HT";
  if (desc.includes("extra time") || desc.includes("et extra")) return `ET ${clock}`;
  if (desc.includes("penalty") || desc.includes("pso")) return "Penalties";
  if (!clock) return "Live";
  return clock.endsWith("'") ? clock : `${clock}'`;
}

function normalizeBroadcasts(broadcasts: ESPNBroadcast[] = []): string[] {
  const names = broadcasts.flatMap((b) => [
    ...(b.names ?? []),
    b.station,
    b.media?.shortName,
    b.media?.callLetters,
    b.media?.name,
  ]);
  return Array.from(
    new Set(names.map((n) => n?.trim()).filter((n): n is string => Boolean(n)))
  ).slice(0, 4);
}

function normalizeFixture(event: ESPNEvent): WCScheduleFixture | null {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const status = comp.status ?? event.status;
  const state = gameStatus(status);

  const competitors = comp.competitors ?? [];
  const homeC = competitors.find((c) => c.homeAway === "home");
  const awayC = competitors.find((c) => c.homeAway === "away");
  const home = {
    name: homeC?.team?.displayName ?? homeC?.team?.shortDisplayName ?? "TBD",
    abbreviation: homeC?.team?.abbreviation ?? "TBD",
    score: Number(homeC?.score ?? 0),
  };
  const away = {
    name: awayC?.team?.displayName ?? awayC?.team?.shortDisplayName ?? "TBD",
    abbreviation: awayC?.team?.abbreviation ?? "TBD",
    score: Number(awayC?.score ?? 0),
  };

  // Assign a group letter ONLY when both teams sit in the same group —
  // i.e. a true group-stage match. Knockout fixtures pair teams from
  // different groups (or carry TBD slots pre-draw), so they fall through
  // to "" and get their stage from ESPN's own round headline. Without
  // this, a knockout match like MEX vs BRA would inherit MEX's "Group A"
  // and could surface as a phantom group fixture.
  const homeG = TEAM_GROUP[home.abbreviation];
  const awayG = TEAM_GROUP[away.abbreviation];
  const group = homeG && homeG === awayG ? homeG : "";
  const slug = event.season?.slug ?? "";
  const stage = group
    ? `Group ${group}`
    : comp.notes?.[0]?.headline ?? slug;

  return {
    id: event.id ?? "",
    date: comp.date ?? event.date ?? "",
    status: state,
    statusText: soccerStatusText(status, state),
    stage,
    group,
    home,
    away,
    broadcasts: normalizeBroadcasts(comp.broadcasts),
  };
}

// ── Standings parsing ──────────────────────────────────────────────────

type ESPNStandingEntry = {
  team?: { abbreviation?: string };
  stats?: { name?: string; value?: number; displayValue?: string }[];
};
type ESPNStandingsResponse = {
  children?: {
    name?: string;
    abbreviation?: string;
    standings?: { entries?: ESPNStandingEntry[] };
  }[];
};

function statNum(entry: ESPNStandingEntry, name: string): number {
  const s = entry.stats?.find((x) => x.name === name);
  if (!s) return 0;
  if (typeof s.value === "number") return s.value;
  const n = Number(s.displayValue);
  return Number.isFinite(n) ? n : 0;
}

function parseStandings(
  json: ESPNStandingsResponse
): Record<string, WCScheduleStanding[]> {
  const out: Record<string, WCScheduleStanding[]> = {};
  for (const child of json.children ?? []) {
    // "Group A" -> "A"
    const letter = (child.name ?? "").replace(/^group\s+/i, "").trim();
    if (!letter) continue;
    const rows: WCScheduleStanding[] = (child.standings?.entries ?? [])
      .map((e) => {
        const gf = statNum(e, "pointsFor");
        const ga = statNum(e, "pointsAgainst");
        return {
          code: e.team?.abbreviation ?? "",
          played: statNum(e, "gamesPlayed"),
          points: statNum(e, "points"),
          gf,
          ga,
          gd: gf - ga,
          position: statNum(e, "rank"),
        };
      })
      .filter((r) => r.code)
      .sort((a, b) => a.position - b.position);
    out[letter] = rows;
  }
  return out;
}

// ── Fetch + cache ──────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ESPN HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function buildPayload(now: number): Promise<WCSchedulePayload> {
  const [scoreboard, standingsJson] = await Promise.all([
    fetchJson<{ events?: ESPNEvent[] }>(SCOREBOARD_URL),
    fetchJson<ESPNStandingsResponse>(STANDINGS_URL).catch(() => ({})),
  ]);
  const fixtures = (scoreboard.events ?? [])
    .map(normalizeFixture)
    .filter((f): f is WCScheduleFixture => f !== null && f.id !== "")
    .sort((a, b) => a.date.localeCompare(b.date));
  const standings = parseStandings(standingsJson as ESPNStandingsResponse);
  return { fixtures, standings, fetchedAt: now };
}

export async function GET() {
  const now = Date.now();

  // Serve a warm cache when we have one.
  try {
    const cached = await kv.get<WCSchedulePayload>(CACHE_KEY);
    if (cached && now - cached.fetchedAt < CACHE_TTL_SECONDS * 1000) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch {
    /* KV absent — fall through to a live fetch */
  }

  try {
    const payload = await buildPayload(now);
    try {
      await kv.set(CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* best-effort cache write */
    }
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // ESPN outage — serve a stale cache if we have one, else an honest empty.
    try {
      const stale = await kv.get<WCSchedulePayload>(CACHE_KEY);
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "Cache-Control": "no-store" },
        });
      }
    } catch {
      /* no cache */
    }
    return NextResponse.json(
      { fixtures: [], standings: {}, fetchedAt: now },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
