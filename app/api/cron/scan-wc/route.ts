// Cron entrypoint — Summer Soccer pass.
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
  wcStateChanged,
} from "../../../lib/push/wc-state-cache";
import { isStateRelevant } from "../../../lib/push/scan-relevance";
import { incrCounter } from "../../../lib/push/ops-metrics";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import type { PushEvent } from "../../../lib/push/event-detector";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";

// Summer Soccer green accent for the Live Activity (AGENTS palette).
const ACCENT_WC = "#1e6b3c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type FeedEvent = {
  minute: number | null;
  type: "goal" | "pen_goal" | "own_goal" | "red_card" | "yellow_card";
  playerName?: string;
};

type FeedGame = {
  id: string;
  status: "live" | "upcoming" | "final";
  /** ISO kickoff time from the feed. Used by the relevance gate to skip
   *  per-game KV work for the dense future-fixture window and old finals. */
  date?: string;
  statusText?: string;
  stage?: string;
  group?: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
  /** Per-match goal / card timeline from /api/world-cup's normalizeEvents.
   *  We read the latest goal's scorer to name it in the push. */
  events?: FeedEvent[];
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

// Latest goal scorer for the push body. Picks the goal event with the
// highest minute (the most recent), which is the one that just moved the
// scoreline when the detector fires wc-goal. Own goals are tagged "(OG)"
// so the push reads honestly. Null when no goal carried a name.
function latestScorer(events: FeedEvent[] | undefined): string | null {
  if (!events || events.length === 0) return null;
  const goals = events.filter(
    (e) =>
      (e.type === "goal" || e.type === "pen_goal" || e.type === "own_goal") &&
      !!e.playerName
  );
  if (goals.length === 0) return null;
  const latest = goals.reduce((best, e) =>
    (e.minute ?? -1) >= (best.minute ?? -1) ? e : best
  );
  const name = latest.playerName as string;
  return latest.type === "own_goal" ? `${name} (OG)` : name;
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
    // Same halftime-break test the lock-screen status line uses, so the
    // detector and the Live Activity agree on what "halftime" means.
    isHalftime: !!game.statusText && /ht|half/i.test(game.statusText),
    lastScorer: latestScorer(game.events),
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
  const isHalftime = !!game.statusText && /ht|half/i.test(game.statusText);
  const minute = parseMinute(game.statusText);

  // The minute is part of the dedup sig, so the cron pushes the real feed
  // minute (~once a tick) and the Live Activity shows the actual match
  // clock — never frozen at the last goal, never drifting ahead of play.
  // `meaningfulSig` excludes the minute: a tick where only the minute
  // changed is a low-priority (5) update the system can batch; a score /
  // status / halftime change is high-priority (10). The frequent-updates
  // entitlement (build 11) is what keeps the minute pushes from being
  // throttled out.
  const meaningfulSig = `${game.away.score}-${game.home.score}-${game.status}-${
    isHalftime ? "ht" : "run"
  }`;

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
    sig: `${meaningfulSig}-${minute ?? ""}`,
    meaningfulSig,
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
  const nowMs = Date.now();
  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;

  // Relevance gate — only games that can transition this tick get KV
  // state work (live, kicking off within 30 min, or recently final).
  // The WC feed carries a ~14-day rolling fixture window; processing
  // every future fixture every minute is what burned the Upstash
  // free-tier command budget. Computed from feed data only (no KV).
  const relevant = games.filter((g) => isStateRelevant(g.status, g.date, nowMs));

  await incrCounter("cron.scans");

  for (const game of relevant) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedWCState(fresh.gameId);
      const { events, nextState } = detectWCEvents(prev, fresh);
      if (events.length > 0) {
        allEvents.push(...events);
        await incrCounter("events.detected", events.length);
      }
      // Only write when something detection-relevant changed (ignores the
      // ever-advancing minute). Skips the bulk of writes for stable games.
      if (wcStateChanged(prev, nextState)) {
        await writeCachedWCState(nextState);
      }
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-wc state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  // Fail LOUD when there are games but we processed NONE — that means
  // every per-game state read/write threw, which in practice is KV being
  // unreachable or misconfigured. Returning 200 here would let the cron
  // look healthy on cron-job.org while no events are ever detected and
  // no WC alert ever fires (the silent-success failure mode). A 500
  // trips the scheduler's failure alert so the outage is visible.
  // Gate on `relevant` not `games`: an all-future slate legitimately
  // processes zero and must stay a 200, not look like a KV outage.
  if (relevant.length > 0 && processed === 0 && stateErrors > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "all games failed state processing (KV unreachable?)",
        processed,
        stateErrors,
        games: relevant.length,
      },
      { status: 500 }
    );
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
  // Only touch the store when there's a live or recently-final match to
  // update or end — skips the listActivityGameIds() KV read on idle /
  // upcoming-only ticks.
  let liveActivity: Awaited<ReturnType<typeof pushLiveActivityUpdates>> | null =
    null;
  const laGames = relevant.filter(
    (g) => g.status === "live" || g.status === "final"
  );
  if (laGames.length > 0) {
    try {
      liveActivity = await pushLiveActivityUpdates(laGames.map(toActivityInput));
    } catch (err) {
      console.error("scan-wc live-activity error", err);
    }
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
