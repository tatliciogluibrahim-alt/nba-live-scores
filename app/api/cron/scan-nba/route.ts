// Cron entrypoint — hit externally by GitHub Actions every 5 minutes
// (see .github/workflows/scan-nba-cron.yml). Vercel Hobby plan blocks
// sub-daily cron schedules, so we drive this from outside.
//
// What it does, in order:
//   1. Auth (Bearer CRON_SECRET — same secret stored in Vercel env
//      and as a GitHub repo secret used by the workflow).
//   2. Fetch the canonical /api/live-scores response. We deliberately
//      go through the public route rather than importing the parser
//      because that route has lots of upstream-massaging logic we
//      don't want to fork. One HTTP hop per minute is cheap.
//   3. For each game, read cached state, run the event detector,
//      dispatch any events that fired, and write the new state.
//   4. Respond with a small JSON summary for the Vercel cron log.
//
// Failure modes:
//   • Upstream NBA feed is down → /api/live-scores returns empty games
//     array, the cron is a no-op. Acceptable — when the feed comes
//     back, the next tick resumes detection.
//   • KV is unreachable → state-cache reads/writes throw, the cron
//     returns 500. Vercel will log and retry next minute.
//   • web-push delivery fails for one device → dispatcher swallows it
//     and records the reason. Cron continues for other devices.

import { NextResponse } from "next/server";
import { requireCronBearer } from "../../../lib/request-guards";
import { detectEvents, type FreshGameState, type PushEvent } from "../../../lib/push/event-detector";
import { dispatchEvents } from "../../../lib/push/dispatcher";
import { readCachedState, writeCachedState, nbaStateChanged } from "../../../lib/push/state-cache";
import { isStateRelevant } from "../../../lib/push/scan-relevance";
import { incrCounter, writeLastScanAt } from "../../../lib/push/ops-metrics";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import {
  detectNBAHighlights,
  type HighlightLeader,
} from "../../../lib/push/nba-highlight-detector";
import {
  readFiredHighlights,
  writeFiredHighlights,
} from "../../../lib/push/highlight-state-cache";
import { saveGameSnapshot } from "../../../lib/snapshots/game-snapshot";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";
import type { Game } from "../../../nba/types";

// NBA orange accent for the Live Activity (AGENTS palette).
const ACCENT_NBA = "#e55b2a";

/** Build the lock-screen status line: "Q3 · 4:21", "Final", etc.
 *
 *  Halftime detection: app/api/live-scores/route.ts normalizes ESPN's
 *  "halftime" statusText to "End Q2". This function sees that and
 *  returns "Halftime" so the lock screen shows the correct label
 *  instead of the raw "Q2 · 0:00" that was appearing before.
 *
 *  End-of-period markers ("End Q1", "End Q3") are passed through so
 *  the lock screen reads "End Q1" at the first-quarter buzzer instead
 *  of "Q1 · 0:00". */
function nbaStatusLine(g: NormalizedGame): string {
  if (g.status === "final") return "Final";
  if (g.status === "upcoming") return "Tipoff soon";

  // Detect halftime. Two sources:
  //   1. statusText = "End Q2" (set by live-scores route when ESPN
  //      sends a halftime-flagged game status).
  //   2. period === 2 && remaining === 0 (fallback: ESPN sometimes
  //      holds remaining at 0 through the break without an explicit
  //      halftime label in statusText).
  if (g.statusText === "End Q2" || (g.period === 2 && g.remaining === 0)) {
    return "Halftime";
  }

  // Other end-of-period labels from the live-scores normalizer.
  if (g.statusText === "End Q1") return "End Q1";
  if (g.statusText === "End Q3") return "End Q3";

  const period =
    g.period <= 4 ? `Q${g.period}` : g.period === 5 ? "OT" : `${g.period - 4}OT`;
  if (g.remaining == null) return period;
  const m = Math.floor(g.remaining / 60);
  const s = g.remaining % 60;
  return `${period} · ${m}:${String(s).padStart(2, "0")}`;
}

/** Map a scoreboard game to a Live Activity content snapshot. */
function toActivityInput(g: NormalizedGame): ActivityUpdateInput {
  const statusLine = nbaStatusLine(g);

  // Coarse clock bucket — round remaining seconds to the nearest
  // 20-second window. Including this in the sig means the Live
  // Activity clock updates whenever the ESPN-reported time crosses a
  // 20-second boundary, not just on score/period/status changes.
  // Without this, a 90-second scoring drought leaves the lock-screen
  // clock frozen, making the lag feel much worse than it is.
  // 20s chosen: fine enough to feel live, coarse enough that we're
  // not hammering APNs on every ESPN sub-second tick.
  const clockBucket = g.remaining != null ? Math.floor(g.remaining / 20) : -1;

  return {
    gameId: g.id,
    status: g.status,
    contentState: {
      awayCode: g.away.abbreviation,
      awayScore: g.away.score,
      homeCode: g.home.abbreviation,
      homeScore: g.home.score,
      statusLine,
      subline: "",
      accentHex: ACCENT_NBA,
      // Stadium Panel progress rail.
      progress: computeLiveActivityProgress("nba", statusLine, g.status),
    },
    // Dedup sig: score + period + status + coarse clock bucket.
    // The clock bucket ensures we push whenever the displayed time
    // would be stale by ~20s of game time, even with no scoring.
    sig: `${g.away.score}-${g.home.score}-${g.period}-${g.status}-${clockBucket}`,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type NormalizedGame = {
  id: string;
  status: "live" | "upcoming" | "final";
  /** ISO kickoff/tip time from the feed. Used by the relevance gate to
   *  skip per-game KV work for far-future fixtures and long-past finals. */
  date?: string;
  statusText: string;
  period: number;
  remaining: number | null;
  home: { abbreviation: string; score: number };
  away: { abbreviation: string; score: number };
  /** Series context label from ESPN (e.g. "Game 7", "Game 4"). Used
   *  by the event detector to flag Game 7 tipoffs for the dispatcher
   *  override. Optional because not all games carry it. */
  gameContext?: string;
};

type LiveScoresResponse = {
  games?: NormalizedGame[];
};

function resolveBaseUrl(req: Request): string {
  // Always use the incoming request's origin. When GitHub Actions (or
  // curl) hits us at https://nonoisescores.app/api/cron/scan-nba, the
  // request origin is the public alias, so the internal fetch back to
  // /api/live-scores stays on the public alias too.
  //
  // Avoid `process.env.VERCEL_URL` — that resolves to the deployment-
  // specific URL (nba-live-scores-xyz123.vercel.app) which is gated by
  // Vercel Deployment Protection and returns 401 on server-to-server
  // fetches even though the production alias is publicly accessible.
  return new URL(req.url).origin;
}


function toFresh(game: NormalizedGame): FreshGameState {
  return {
    gameId: game.id,
    status: game.status,
    period: game.period,
    awayCode: game.away.abbreviation,
    homeCode: game.home.abbreviation,
    awayScore: game.away.score,
    homeScore: game.home.score,
    secondsRemaining: game.remaining,
    // statusText carries the "End Q1" / "End Q2" / "End Q3" markers
    // that the event detector now uses to fire eoq-N the moment a
    // quarter wraps. Without this field the detector falls back to
    // period-increment, which fires when the next quarter starts.
    statusText: game.statusText,
    // gameContext carries the "Game N" label so the detector can flag
    // Game 7 tipoffs for the dispatcher override (Phase 21C).
    gameContext: game.gameContext,
  };
}

export async function GET(req: Request) {
  if (!requireCronBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Observability anchor ────────────────────────────────────────────
  // cronStartMs lets us log the wall-clock time spent in each phase so
  // future latency investigations have timestamps to work from instead
  // of guessing from log ordering. Use this for "source feed fetched at"
  // and "APNs push sent at" in per-game logs below.
  const cronStartMs = Date.now();

  const baseUrl = resolveBaseUrl(req);

  // Fetch the canonical scoreboard. `no-store` so we don't pick up a
  // stale CDN cache — we want the freshest read possible from upstream.
  let payload: LiveScoresResponse;
  try {
    const res = await fetch(`${baseUrl}/api/live-scores`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `live-scores ${res.status}` },
        { status: 502 }
      );
    }
    payload = (await res.json()) as LiveScoresResponse;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "live-scores fetch failed" },
      { status: 502 }
    );
  }
  // Log feed freshness anchor. Timestamp lets us correlate Vercel log
  // lines against wall-clock time when debugging future lag reports.
  const feedFetchedMs = Date.now();
  const liveGameIds = (payload.games ?? [])
    .filter((g) => g.status === "live")
    .map((g) => g.id);
  if (liveGameIds.length > 0) {
    console.log("[scan-nba] feed fetched", {
      feedFetchMs: feedFetchedMs - cronStartMs,
      liveGames: liveGameIds.length,
      liveGameIds,
    });
  }

  const games = payload.games ?? [];
  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;

  // Relevance gate — only games that can transition this tick get KV
  // state work (live, tipping within 30 min, or recently final). The
  // feed's rolling window also carries days of future fixtures and old
  // finals; processing those every minute is what burned the Upstash
  // free-tier command budget. Computed from feed data only (no KV).
  const relevant = games.filter((g) => isStateRelevant(g.status, g.date, cronStartMs));

  // Bump the scan counter once per successful upstream fetch. The
  // dashboard divides by this to compute "events per scan" etc.
  await incrCounter("cron.scans");
  // Heartbeat — stamp that the NBA scan ran this tick, so a dead scheduler
  // is visible on /api/push/inspect.
  await writeLastScanAt("nba");

  for (const game of relevant) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedState(fresh.gameId);
      const { events, nextState } = detectEvents(prev, fresh);
      if (events.length > 0) {
        allEvents.push(...events);
        await incrCounter("events.detected", events.length);
      }
      // Only write when something detection-relevant actually changed.
      // Most ticks for a stable game (upcoming waiting to tip, live
      // between scores, settled final) are no-ops, so this skips the
      // bulk of state writes. The 6h TTL is comfortably longer than any
      // game's relevance window, so not refreshing it on a skip is safe.
      if (nbaStateChanged(prev, nextState)) {
        await writeCachedState(nextState);
      }
      // Snapshot on the live→final transition only, not every tick the
      // game lingers as final in the feed. Snapshots persist 60 days so
      // /game/[id] resolves the game after it drops off the live feed.
      if (fresh.status === "final" && prev?.status !== "final") {
        await saveGameSnapshot(game as unknown as Game);
      }
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-nba state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  // Fail LOUD when there were RELEVANT games but we processed NONE —
  // every per-game state read/write threw, which in practice means KV is
  // unreachable. A 200 here would look healthy on cron-job.org while no
  // NBA alert ever fires (silent-success failure). A 500 trips the
  // scheduler's alert. Gate on `relevant` not `games`: an all-future
  // slate legitimately processes zero and must stay a 200.
  if (relevant.length > 0 && processed === 0 && stateErrors > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "all games failed state processing (KV unreachable?)",
        processed,
        stateErrors,
        games: games.length,
      },
      { status: 500 }
    );
  }

  // Player-milestone highlights (Full Details tier). For each live game
  // we fetch the per-game summary (leaders) and fire when a scorer
  // crosses 30/40/50/60 PTS. One extra fetch per live game — cheap in
  // the playoffs (1-2 live at once). Best-effort: any failure is logged
  // and skipped so it never blocks the core scan.
  let highlightCount = 0;
  for (const game of games.filter((g) => g.status === "live")) {
    try {
      const res = await fetch(`${baseUrl}/api/nba-game-detail?id=${game.id}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { leaders?: HighlightLeader[] };
      const leaders = json.leaders ?? [];
      if (leaders.length === 0) continue;
      const firedKeys = await readFiredHighlights(game.id);
      const { events, firedKeys: nextFired } = detectNBAHighlights({
        gameId: game.id,
        awayCode: game.away.abbreviation,
        homeCode: game.home.abbreviation,
        awayScore: game.away.score,
        homeScore: game.home.score,
        leaders,
        firedKeys,
      });
      if (events.length > 0) {
        allEvents.push(...events);
        highlightCount += events.length;
        await incrCounter("events.detected", events.length);
        await writeFiredHighlights(game.id, nextFired);
      }
    } catch (err) {
      console.error("scan-nba highlight error", { gameId: game.id, err });
    }
  }

  // ── Dispatch push notifications + Live Activity in parallel ─────────
  //
  // Previously these ran sequentially (dispatch, then LA). They're fully
  // independent: dispatch targets device-token push endpoints; LA targets
  // per-Activity push tokens with a different APNs topic. Running in
  // parallel saves the wall-clock time of whichever finishes first waiting
  // for the other — saves 50-300ms per cron tick during live games.
  //
  // Dispatch error still returns 500 so cron-job.org alarms. LA errors are
  // logged but never block the response — a failed LA update is less
  // critical than a missing push notification.
  const [dispatchSettled, laSettled] = await Promise.allSettled([
    (async () => {
      if (allEvents.length === 0) return null;
      return await dispatchEvents(allEvents);
    })(),
    (async () => {
      // Only touch the Live Activity store when there's a live or
      // recently-final game to update or end. On idle / upcoming-only
      // ticks this skips the listActivityGameIds() KV read entirely.
      const laGames = relevant.filter(
        (g) => g.status === "live" || g.status === "final"
      );
      if (laGames.length === 0) return null;
      return await pushLiveActivityUpdates(laGames.map(toActivityInput));
    })(),
  ]);

  // Unpack results. Dispatch error → 500 (keeps existing behavior).
  let dispatchResult: Awaited<ReturnType<typeof dispatchEvents>> | null = null;
  if (dispatchSettled.status === "rejected") {
    console.error("scan-nba dispatch error", dispatchSettled.reason);
    return NextResponse.json(
      {
        ok: false,
        processed,
        stateErrors,
        events: allEvents.length,
        error:
          dispatchSettled.reason instanceof Error
            ? dispatchSettled.reason.message
            : "dispatch failed",
      },
      { status: 500 }
    );
  }
  dispatchResult = dispatchSettled.value;

  let liveActivity: Awaited<ReturnType<typeof pushLiveActivityUpdates>> | null = null;
  if (laSettled.status === "rejected") {
    console.error("scan-nba live-activity error", laSettled.reason);
  } else {
    liveActivity = laSettled.value;
  }

  // ── Final timing log ─────────────────────────────────────────────────
  // Logged only when there are live games so the log stream stays quiet
  // on off-days. Gives future latency investigations a "server processed
  // at" anchor to compare against the "feed fetched at" line above.
  if (liveGameIds.length > 0) {
    console.log("[scan-nba] tick complete", {
      totalMs: Date.now() - cronStartMs,
      processed,
      events: allEvents.length,
      dispatched: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
      laUpdated: liveActivity?.updated ?? 0,
      laEnded: liveActivity?.ended ?? 0,
      laPruned: liveActivity?.pruned ?? 0,
    });
  }

  return NextResponse.json({
    ok: true,
    processed,
    stateErrors,
    events: allEvents.map((e) => `${e.gameId}:${e.type}`),
    delivered: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
    skipped: dispatchResult?.deliveries.filter((d) => !d.delivered).length ?? 0,
    pruned: dispatchResult?.pruned ?? 0,
    highlights: highlightCount,
    liveActivity,
  });
}
