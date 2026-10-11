import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { normalizeNFLStandings, type NFLStandings } from "./normalize";
import { NFL_SEASON_YEAR } from "../../companion/following/data/nfl-dates";

export const dynamic = "force-dynamic";

// NFL standings for Schedule's Standings tab. One ESPN call returns the whole
// league by division (`level=3`). Pinned to the app's season year and the
// regular season (`seasontype=2`): ESPN's postseason type has no table, and a
// bare request after the Super Bowl would roll to another season.
//
// Same KV posture as /api/nfl-scores: fresh copy served from KV, a live
// fetch on a miss, and on an ESPN outage the last good table (kept an hour)
// or an honest empty 503. Records only move when games end, so ten minutes
// of freshness is plenty and keeps ESPN calls to a few an hour.

const STANDINGS = "https://site.api.espn.com/apis/v2/sports/football/nfl/standings";
const ESPN_TIMEOUT_MS = 8000;
const CACHE_KEY = `nns:nfl:standings:v1:${NFL_SEASON_YEAR}`;
const FRESH_SECONDS = 10 * 60;
// Kept past freshness only as the outage fallback.
const KEEP_SECONDS = 60 * 60;

export type NFLStandingsPayload = NFLStandings & { fetchedAt: number };

async function fetchStandings(): Promise<NFLStandingsPayload> {
  const params = new URLSearchParams({
    level: "3",
    season: String(NFL_SEASON_YEAR),
    seasontype: "2",
  });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const res = await fetch(`${STANDINGS}?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ESPN NFL standings HTTP ${res.status}`);
    const standings = normalizeNFLStandings(await res.json());
    if (!standings) throw new Error("NFL standings failed validation");
    return { ...standings, fetchedAt: Date.now() };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const now = Date.now();

  try {
    const cached = await kv.get<NFLStandingsPayload>(CACHE_KEY);
    if (cached && now - cached.fetchedAt < FRESH_SECONDS * 1000) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    /* KV absent (local dev): live fetch */
  }

  try {
    const payload = await fetchStandings();
    try {
      await kv.set(CACHE_KEY, payload, { ex: KEEP_SECONDS });
    } catch {
      /* best-effort */
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // ESPN outage or a table that failed validation: the last good table if
    // we have one, else an honest empty 503 the tab reads as "unavailable".
    try {
      const stale = await kv.get<NFLStandingsPayload>(CACHE_KEY);
      if (stale) {
        return NextResponse.json(stale, { headers: { "Cache-Control": "no-store" } });
      }
    } catch {
      /* no cache */
    }
    return NextResponse.json(
      { season: NFL_SEASON_YEAR, seasonType: 2, conferences: [], fetchedAt: now },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
