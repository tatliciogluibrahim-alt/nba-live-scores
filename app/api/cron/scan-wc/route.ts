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

import { NextResponse } from "next/server";
import { requireCronBearer } from "../../../lib/request-guards";
import { detectWCEvents, type FreshWCGameState } from "../../../lib/push/wc-event-detector";
import { dispatchEvents } from "../../../lib/push/dispatcher";
import {
  readCachedWCState,
  writeCachedWCState,
  wcStateChanged,
} from "../../../lib/push/wc-state-cache";
import { isStateRelevant } from "../../../lib/push/scan-relevance";
import { incrCounter, writeLastScanAt } from "../../../lib/push/ops-metrics";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import type { PushEvent } from "../../../lib/push/event-detector";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";
import { parseMinute, recentScorer, type ScorerEvent } from "../../../lib/push/wc-scorer";

// Summer Soccer green accent for the Live Activity (AGENTS palette).
const ACCENT_WC = "#1e6b3c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The feed serializes the event minute as a STRING ("9'", "90'+2'"), not a
// number — see wc-scorer.ts. Typing it correctly is what surfaced the
// lexicographic-compare bug that named the wrong scorer.
type FeedEvent = ScorerEvent;

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


function toFresh(game: FeedGame): FreshWCGameState {
  const minute = parseMinute(game.statusText);
  return {
    gameId: game.id,
    status: game.status,
    awayCode: game.away.abbreviation,
    homeCode: game.home.abbreviation,
    awayScore: game.away.score,
    homeScore: game.home.score,
    stage: game.stage,
    minute,
    // Same halftime-break test the lock-screen status line uses, so the
    // detector and the Live Activity agree on what "halftime" means.
    isHalftime: !!game.statusText && /ht|half/i.test(game.statusText),
    // First-half stoppage ("45'+6'") folds to minute 51 via parseMinute, which
    // would (wrongly) trip the minute>50 "second half" fallback. Flag it so the
    // detector excludes it — it is first-half added time, not the second half.
    isFirstHalfStoppage:
      !!game.statusText && /^\s*45\s*'?\s*\+/.test(game.statusText),
    // Only name the scorer when the goal is recent vs the match clock — if the
    // score rose but the goal event hasn't landed in the feed yet, naming the
    // stale "latest" goal would be wrong, so omit it (the push says "Goal").
    lastScorer: recentScorer(game.events, minute),
  };
}

/** Lock-screen status line: "63'", "Halftime", "Full time", etc. */
function wcStatusLine(game: FeedGame): string {
  if (game.status === "final") return "Full time";
  if (game.status === "upcoming") return "Kickoff soon";
  if (game.statusText && /ht|half/i.test(game.statusText)) return "Halftime";
  // Preserve stoppage notation ("45+6'", "90+2'") instead of folding it to a
  // single minute. A folded "51'" reads as a second-half minute when it is
  // really first-half added time.
  const raw = (game.statusText ?? "").trim();
  if (/\d\s*'?\s*\+\s*\d/.test(raw)) {
    return raw.replace(/['\s]/g, "") + "'";
  }
  const min = parseMinute(raw);
  return min != null ? `${min}'` : raw || "Live";
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
  if (!requireCronBearer(req)) {
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
  // Heartbeat — stamp that the WC scan ran this tick, so a dead scheduler
  // is visible on /api/push/inspect.
  await writeLastScanAt("wc");

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
