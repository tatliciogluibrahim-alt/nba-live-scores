// Replay one finished NFL game through the production push pipeline.
//
// Per tick it does what scan-nfl does for one game (detectNFLEvents, then
// the shared scanNFLGamePlays for a live game), then for each synthetic
// profile it does what the dispatcher does per device (subscriberWantsEvent,
// the dedupe slot, No-Spoilers, the iOS lock-screen offer, buildPayload).
// Every decision is the production function, never a copy. What the replay
// adds is bookkeeping: when each push landed, and what happened to every
// play that could have produced one.

import {
  detectNFLEvents,
  type CachedNFLGameState,
} from "../nfl-event-detector";
import { scanNFLGamePlays } from "../nfl-play-scan";
import { isBigPlay } from "../nfl-play-detector";
import { DEDUPE_TTL_SECONDS } from "../dedupe";
import {
  buildLiveActivityOfferPayload,
  buildPayload,
  dedupeTagFor,
  subscriberUsesNoSpoilersForEvent,
  subscriberWantsEvent,
  wantsLiveActivityOffer,
} from "../dispatcher";
import type { EventType, PushEvent } from "../event-detector";
import { buildNFLTimeline, type NFLGameTimeline } from "./nfl-ticks";
import type { ReplaySummary } from "./nfl-summary";
import type { ReplayProfile } from "./profiles";

export type ReplayEvent = { atMs: number; event: PushEvent };

export type PlayOutcome =
  /** The pipeline turned it into an event. */
  | "detected"
  /** Swallowed by scan-nfl's cold-start seed. */
  | "suppressed-cold-start"
  /** Logged after the last live tick: the game already read final, and
   *  scan-nfl only scans plays for live games. A walk-off kick lands here;
   *  the final push carries its score. (Modeled timing.) */
  | "landed-with-final"
  /** Never visible in the modeled current drive on any tick (modeled). */
  | "never-visible";

export type PlayAccounting = {
  playId: string;
  kind: "scoring" | "turnover" | "big-play";
  outcome: PlayOutcome;
  playAtMs: number;
  detectedAtMs?: number;
  text?: string;
  teamCode?: string;
};

export type ReplayDelivery = {
  atMs: number;
  eventType: EventType;
  title: string;
  subtitle?: string;
  body: string;
  /** Notification Center collapse slot (web tag / APNs collapse-id). */
  tag?: string;
  dedupeTag: string;
  /** iOS lock-screen live-score offer instead of the plain start push. */
  offer: boolean;
};

export type NFLGameReplay = {
  gameId: string;
  awayCode: string;
  homeCode: string;
  timeline: NFLGameTimeline;
  events: ReplayEvent[];
  accounting: PlayAccounting[];
  deliveries: Record<string, ReplayDelivery[]>;
};

const DEDUPE_TTL_MS = DEDUPE_TTL_SECONDS * 1000;

export function replayNFLGame(
  summary: ReplaySummary,
  profiles: ReplayProfile[],
  opts: {
    tickMs?: number;
    /** Simulate the cron first seeing this game at this time (it was down
     *  or disabled before). Ticks before it are never observed. */
    joinAtMs?: number;
  } = {}
): NFLGameReplay {
  const timeline = buildNFLTimeline(summary, opts);
  const { gameId, awayCode, homeCode } = timeline;

  // ── Detection: scan-nfl, one game, tick by tick ──────────────────────
  const events: ReplayEvent[] = [];
  let prev: CachedNFLGameState | null = null;
  let fired: string[] = [];
  // Mirrors the route: the fired-play record exists once the play scanner
  // has completed a scan of the game (seeded or not).
  let scannedOnce = false;
  const seeded = new Set<string>();
  const detectedAt = new Map<string, number>();

  for (const tick of timeline.ticks) {
    if (opts.joinAtMs !== undefined && tick.atMs < opts.joinAtMs) continue;
    const { events: stateEvents, nextState } = detectNFLEvents(prev, tick.fresh);
    prev = nextState;
    for (const event of stateEvents) events.push({ atMs: tick.atMs, event });

    // scan-nfl only fetches the summary for live games, and skips the
    // fired-set read when the summary has nothing in it.
    if (tick.fresh.status !== "live") continue;
    if (tick.scoringPlays.length === 0 && tick.drivePlays.length === 0) continue;
    const before = new Set(fired);
    const scan = scanNFLGamePlays({
      gameId,
      awayCode,
      homeCode,
      awayScore: tick.fresh.awayScore,
      homeScore: tick.fresh.homeScore,
      scoringPlays: tick.scoringPlays,
      drivePlays: tick.drivePlays,
      driveTeamCode: tick.driveTeamCode,
      firedPlayIds: fired,
      firstObservation: !scannedOnce,
    });
    scannedOnce = true;
    const added = scan.firedPlayIds.filter((id) => !before.has(id));
    if (scan.kind === "seeded") {
      for (const id of added) seeded.add(id);
      fired = scan.firedPlayIds;
      continue;
    }
    if (scan.events.length === 0) continue;
    for (const id of added) detectedAt.set(id, tick.atMs);
    fired = scan.firedPlayIds;
    for (const event of scan.events) events.push({ atMs: tick.atMs, event });
  }

  // ── Accounting: every play that could have become a push ──────────────
  const scoringById = new Map(summary.scoringPlays.map((s) => [s.id, s]));
  const lastLiveTickMs = Math.max(
    Number.NEGATIVE_INFINITY,
    ...timeline.ticks.filter((t) => t.fresh.status === "live").map((t) => t.atMs)
  );
  const accounting: PlayAccounting[] = [];
  for (const p of timeline.plays) {
    const scoring = scoringById.get(p.id);
    const kind: PlayAccounting["kind"] | null = scoring
      ? "scoring"
      : p.isTurnover && !p.scoringPlay
        ? "turnover"
        : isBigPlay(p)
          ? "big-play"
          : null;
    if (!kind) continue;
    const detectedAtMs = detectedAt.get(p.id);
    accounting.push({
      playId: p.id,
      kind,
      outcome:
        detectedAtMs !== undefined
          ? "detected"
          : seeded.has(p.id)
            ? "suppressed-cold-start"
            : p.visibleAtMs > lastLiveTickMs
              ? "landed-with-final"
              : "never-visible",
      playAtMs: p.visibleAtMs,
      ...(detectedAtMs !== undefined ? { detectedAtMs } : {}),
      text: scoring?.text ?? p.text,
      teamCode: scoring?.team?.abbreviation ?? p.driveTeamCode,
    });
  }

  // ── Delivery: the dispatcher's per-device decisions ───────────────────
  const deliveries: Record<string, ReplayDelivery[]> = {};
  for (const profile of profiles) {
    const claims = new Map<string, number>();
    const out: ReplayDelivery[] = [];
    for (const { atMs, event } of events) {
      if (!subscriberWantsEvent(profile.prefs, event)) continue;
      const dedupeTag = dedupeTagFor(event);
      const claimedAt = claims.get(dedupeTag);
      if (claimedAt !== undefined && atMs - claimedAt < DEDUPE_TTL_MS) continue;
      claims.set(dedupeTag, atMs);
      const offer =
        profile.platform === "ios" && wantsLiveActivityOffer(profile.prefs, event);
      const noSpoilers = subscriberUsesNoSpoilersForEvent(profile.prefs, event);
      const payload = offer
        ? buildLiveActivityOfferPayload(event)
        : buildPayload(event, noSpoilers);
      out.push({
        atMs,
        eventType: event.type,
        title: payload.title,
        ...(payload.subtitle ? { subtitle: payload.subtitle } : {}),
        body: payload.body,
        ...(payload.tag ? { tag: payload.tag } : {}),
        dedupeTag,
        offer,
      });
    }
    deliveries[profile.id] = out;
  }

  return { gameId, awayCode, homeCode, timeline, events, accounting, deliveries };
}

/** What Notification Center holds after the game: one card per collapse
 *  tag, the latest push in each slot, newest first. */
export function notificationStack(deliveries: ReplayDelivery[]): ReplayDelivery[] {
  const slots = new Map<string, ReplayDelivery>();
  for (const d of deliveries) {
    const key = d.tag ?? d.dedupeTag;
    slots.delete(key);
    slots.set(key, d);
  }
  return [...slots.values()].reverse();
}
