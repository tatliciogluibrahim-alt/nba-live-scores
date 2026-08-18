// GET /api/nfl-game-detail?event={id}
//
// The NFL game-detail read (Phase 22 gate 5): scoring plays, per-team
// leaders, and the per-quarter line, from the same ESPN summary endpoint
// scan-nfl already calls for the play detector. Mirrors
// /api/nba-game-detail's posture — no cache, short timeout, honest empty
// payload on failure so the detail page degrades to its lean shell instead
// of erroring.

import { NextRequest, NextResponse } from "next/server";
import {
  EMPTY_NFL_DETAIL,
  normalizeNFLGameDetail,
  type ESPNNFLSummary,
} from "./normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=";
const ESPN_TIMEOUT_MS = 8000;

function empty(error?: string) {
  return {
    ...EMPTY_NFL_DETAIL,
    updatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

export async function GET(request: NextRequest) {
  // Accept `?event=` and `?id=` both — the NBA sibling drifted apart from
  // its cron caller on exactly this and silently 400'd for months.
  const event =
    request.nextUrl.searchParams.get("event") ??
    request.nextUrl.searchParams.get("id");

  if (!event) {
    return NextResponse.json(empty("Missing event id"), { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const res = await fetch(`${SUMMARY_URL}${encodeURIComponent(event)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ESPN NFL summary HTTP ${res.status}`);
    const data = (await res.json()) as ESPNNFLSummary;

    return NextResponse.json(
      { ...normalizeNFLGameDetail(data), updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("NFL game detail API error:", error);
    return NextResponse.json(empty("Unable to fetch game detail"), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
