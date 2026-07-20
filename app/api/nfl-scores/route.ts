import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { normalizeNFLGame, type ESPNNFLEvent, type NFLGameLite } from "./normalize";
import { NFL_SEASON_YEAR } from "../../companion/following/data/nfl-dates";

export const dynamic = "force-dynamic";

// NFL scoreboard feed (Phase 22 gate 2). ESPN's football scoreboard returns
// a whole week in one call — unlike the WC route's per-day fan-out — so this
// is a single fetch. `?week=N&seasontype=T` selects a specific week (Schedule
// By-week paging); no params = the current week ESPN serves.
//
// KV-cached briefly (fresh for live scores, light on ESPN); degrades to a
// live fetch when KV is absent (local dev) and to a stale/empty 503 on an
// ESPN outage — the same posture as /api/world-cup.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ESPN_TIMEOUT_MS = 8000;
const CACHE_PREFIX = "nns:nfl:scoreboard:v1";
const CACHE_TTL_SECONDS = 30; // NFL plays are slow; 30s is plenty for live

export type NFLSchedulePayload = {
  games: NFLGameLite[];
  /** The week these games belong to (echoed from the feed envelope). */
  week: number;
  /** 1 preseason · 2 regular · 3 postseason. */
  seasonType: number;
  fetchedAt: number;
};

type ESPNScoreboard = {
  events?: ESPNNFLEvent[];
  week?: { number?: number };
  season?: { type?: number };
};

function cacheKey(week: string | null, seasonType: string | null): string {
  return `${CACHE_PREFIX}:${seasonType ?? "cur"}:${week ?? "cur"}`;
}

async function fetchScoreboard(
  week: string | null,
  seasonType: string | null
): Promise<NFLSchedulePayload> {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  if (seasonType) params.set("seasontype", seasonType);
  // Pin the season year on a PAGED request (a specific week). Without it
  // ESPN serves the last COMPLETED season for that week — so paging past
  // the current week would show last year's final scores. The bare
  // "current week" request (no week) is left alone: ESPN's default already
  // returns the right current week, and `dates=<year>` alone spans the
  // whole year and trips the 100-event cap.
  if (week) params.set("dates", String(NFL_SEASON_YEAR));
  const url = params.toString() ? `${SCOREBOARD}?${params}` : SCOREBOARD;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ESPN NFL HTTP ${res.status}`);
    const data = (await res.json()) as ESPNScoreboard;
    if (!Array.isArray(data?.events)) throw new Error("NFL response missing events");
    const wk = data.week?.number ?? 0;
    const st = data.season?.type ?? 0;
    const games = data.events
      .map((e) => normalizeNFLGame(e, wk, st))
      .filter((g): g is NFLGameLite => g !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { games, week: wk, seasonType: st, fetchedAt: Date.now() };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const week = url.searchParams.get("week");
  const seasonType = url.searchParams.get("seasontype");
  const key = cacheKey(week, seasonType);
  const now = Date.now();

  // Warm cache.
  try {
    const cached = await kv.get<NFLSchedulePayload>(key);
    if (cached && now - cached.fetchedAt < CACHE_TTL_SECONDS * 1000) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    /* KV absent — live fetch */
  }

  try {
    const payload = await fetchScoreboard(week, seasonType);
    try {
      await kv.set(key, payload, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* best-effort */
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // ESPN outage — serve stale if we have it, else an honest empty 503.
    try {
      const stale = await kv.get<NFLSchedulePayload>(key);
      if (stale) return NextResponse.json(stale, { headers: { "Cache-Control": "no-store" } });
    } catch {
      /* no cache */
    }
    return NextResponse.json(
      { games: [], week: 0, seasonType: 0, fetchedAt: now },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
