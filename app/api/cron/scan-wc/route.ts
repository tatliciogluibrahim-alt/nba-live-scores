// Cron entrypoint — World Cup pass.
//
// Parallels /api/cron/scan-nba but reads /api/world-cup and routes
// transitions through the WC detector and the shared dispatcher.
//
// Drive externally (GitHub Actions or any other scheduler). One curl
// per minute is cheap; the WC schedule is dense enough during the
// tournament that 5-minute polling would miss short matches.
//
// Failure modes:
//   • Upstream WC feed empty → cron is a no-op for that tick. Acceptable.
//   • KV unreachable → 500, retry next tick.
//   • One sub fails inside dispatch → dispatcher swallows it per-sub.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { detectWCEvents, type FreshWCGameState } from "../../../lib/push/wc-event-detector";
import { dispatchEvents } from "../../../lib/push/dispatcher";
import {
  readCachedWCState,
  writeCachedWCState,
} from "../../../lib/push/wc-state-cache";
import { incrCounter } from "../../../lib/push/ops-metrics";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import type { PushEvent } from "../../../lib/push/event-detector";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";

// World Cup green accent for the Live Activity (AGENTS palette).
const ACCENT_WC = "#1e6b3c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type FeedGame = {
  id: string;
  status: "live" | "upcoming" | "final";
  statusText?: string;
  stage?: string;
  group?: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
};

type WCResponse = {
  games?: FeedGame[];
};

function resolveBaseUrl(req: Request): string {
  return new URL(req.url).origin;
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Best-effort minute parser. The WC feed often returns statusText like
// "45+2" or "63'" — extract the leading number. Null when not present
// (halftime, full-time, pre-match).
function parseMinute(statusText: string | undefined): number | null {
  if (!statusText) return null;
  const m = statusText.match(/(\d{1,3})(?:\+(\d{1,2}))?/);
  if (!m) return null;
  const base = Number(m[1]);
  const stoppage = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(base)) return null;
  return base + stoppage;
}

function toFresh(game: FeedGame): FreshWCGameState {
  return {
    gameId: game.id,
    status: game.status,
    awayCode: game.away.abbreviation,
    homeCode: game.home.abbreviation,
    awayScore: game.away.score,
    homeScore: game.home.score,
    minute: parseMinute(game.statusText),
  };
}

/** Lock-screen status line: "63'", "Halftime", "Full time", etc. */
function wcStatusLine(game: FeedGame): string {
  if (game.status === "final") return "Full time";
  if (game.status === "upcoming") return "Kickoff soon";
  if (game.statusText && /ht|half/i.test(game.statusText)) return "Halftime";
  const min = parseMinute(game.statusText);
  return min != null ? `${min}'` : game.statusText || "Live";
}

/** Map a WC feed game to a Live Activity content snapshot. */
function toActivityInput(game: FeedGame): ActivityUpdateInput {
  const statusLine = wcStatusLine(game);
  return {
    gameId: game.id,
    status: game.status,
    contentState: {
      awayCode: game.away.abbreviation,
      awayScore: game.away.score,
      homeCode: game.home.abbreviation,
      homeScore: game.home.score,
      statusLine,
      // Center-bug context line. Group / stage if available.
      subline: (game.stage || game.group || "").toUpperCase(),
      accentHex: ACCENT_WC,
      // Stadium Panel progress rail.
      progress: computeLiveActivityProgress("wc", statusLine, game.status),
    },
    // Dedup on score + status (the minute advances every tick and we
    // don't want a push a minute; goals + transitions are what matter).
    sig: `${game.away.score}-${game.home.score}-${game.status}`,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = resolveBaseUrl(req);

  let payload: WCResponse;
  try {
    const res = await fetch(`${baseUrl}/api/world-cup`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `world-cup ${res.status}` },
        { status: 502 }
      );
    }
    payload = (await res.json()) as WCResponse;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "world-cup fetch failed" },
      { status: 502 }
    );
  }

  const games = payload.games ?? [];
  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;

  await incrCounter("cron.scans");

  for (const game of games) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedWCState(fresh.gameId);
      const { events, nextState } = detectWCEvents(prev, fresh);
      if (events.length > 0) {
        allEvents.push(...events);
        await incrCounter("events.detected", events.length);
      }
      await writeCachedWCState(nextState);
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-wc state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  let dispatchResult: Awaited<ReturnType<typeof dispatchEvents>> | null = null;
  if (allEvents.length > 0) {
    try {
      dispatchResult = await dispatchEvents(allEvents);
    } catch (err) {
      console.error("scan-wc dispatch error", err);
      return NextResponse.json(
        {
          ok: false,
          processed,
          stateErrors,
          events: allEvents.length,
          error: err instanceof Error ? err.message : "dispatch failed",
        },
        { status: 500 }
      );
    }
  }

  // Live Activity score updates for any pinned WC match on a device.
  let liveActivity: Awaited<ReturnType<typeof pushLiveActivityUpdates>> | null =
    null;
  try {
    liveActivity = await pushLiveActivityUpdates(games.map(toActivityInput));
  } catch (err) {
    console.error("scan-wc live-activity error", err);
  }

  return NextResponse.json({
    ok: true,
    processed,
    stateErrors,
    events: allEvents.map((e) => `${e.gameId}:${e.type}`),
    delivered: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
    skipped: dispatchResult?.deliveries.filter((d) => !d.delivered).length ?? 0,
    pruned: dispatchResult?.pruned ?? 0,
    liveActivity,
  });
}
