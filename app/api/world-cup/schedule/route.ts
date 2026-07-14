import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { WC_LEAGUE } from "../../../lib/wc-league";
import { resolveFrozenChampion } from "../../../lib/wc-champion-store";
import type { WCChampion } from "../../../lib/wc-champion";
import { normalizeFixture, type ESPNEvent } from "./normalize";

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

// ── Output shapes ──────────────────────────────────────────────────────

export type WCScheduleFixture = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { name: string; abbreviation: string; score: number; winner?: boolean };
  away: { name: string; abbreviation: string; score: number; winner?: boolean };
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
  /** The tournament champion once the final is decided, frozen so it
   *  survives ESPN dropping the fixture. Null until then. */
  champion: WCChampion | null;
  fetchedAt: number;
};

// ESPN event parsing lives in ./normalize (route files may only export
// route fields, and normalizeFixture is test-covered pure logic).

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
  const champion = await resolveFrozenChampion(fixtures, now);
  return { fixtures, standings, champion, fetchedAt: now };
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
      { fixtures: [], standings: {}, champion: null, fetchedAt: now },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
