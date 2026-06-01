// GET /api/cron/reminders
//
// Pre-game reminder cron. Runs every few minutes (driven externally by
// cron-job.org, same as scan-nba / scan-wc). For each subscriber, fires
// ONE calm "starts soon" push N minutes before tipoff for the games they
// follow (N = their remindBeforeMinutes, default 30).
//
// Design:
//   • Isolated from the live event dispatcher — this never touches
//     dispatchEvents, so it can't affect live notifications.
//   • Reminders are score-free ("BRA vs SUI · starts in 30 min"), so
//     they're No-Spoilers-safe by construction.
//   • Only alert-enabled follows of kind team / country / series get
//     reminders. Tournament follows are excluded so following a whole
//     tournament doesn't ping you before every single game.
//   • Quiet Hours suppress reminders just like live pushes.
//   • Deduped per (game, device) via claimDelivery, so a game reminds
//     at most once per device.
//
// Auth: Bearer CRON_SECRET (timing-safe), same as the scan crons.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  encodePushPayload,
  getWebPush,
  type PushPayload,
} from "../../../lib/push/web-push-config";
import {
  listSubscriptions,
  removeSubscription,
} from "../../../lib/push/subscription-store";
import {
  listIosTokens,
  removeIosToken,
} from "../../../lib/push/ios-token-store";
import { sendApnsPush } from "../../../lib/push/apns-sender";
import { claimDelivery } from "../../../lib/push/dedupe";
import { isWithinQuietHours } from "../../../lib/push/quiet-hours";
import type { SyncedAlert } from "../../../lib/push/sync-validation";
import {
  gameMatchIds,
  reminderFollowIds,
  intersects,
  type FeedGame,
} from "./lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_REMIND_MINUTES = 30;
// Don't bother considering games more than this far out — the largest
// reminder lead time the UI offers is 60 min; the slack covers cron jitter.
const MAX_LOOKAHEAD_MS = 185 * 60 * 1000;

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length).trim());
  const b = Buffer.from(expected);
  if (provided.length !== b.length) return false;
  return timingSafeEqual(provided, b);
}

async function fetchGames(url: string): Promise<FeedGame[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: FeedGame[] };
    return Array.isArray(json.games) ? json.games : [];
  } catch {
    return [];
  }
}


type UpcomingGame = {
  id: string;
  tipoffMs: number;
  title: string;
  ids: Set<string>;
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = new URL(req.url).origin;
  const nowMs = Date.now();

  const [nba, wc] = await Promise.all([
    fetchGames(`${baseUrl}/api/live-scores`),
    fetchGames(`${baseUrl}/api/world-cup`),
  ]);

  // Build the set of upcoming games whose tipoff is near enough to
  // reminder for SOMEONE (max lead time). Per-subscriber lead time is
  // checked below.
  const upcoming: UpcomingGame[] = [];
  let skippedMalformed = 0;
  for (const game of [...nba, ...wc]) {
    if (game.status !== "upcoming") continue;
    // Hard guard on the fields we actually need. A malformed feed row
    // (missing id, abbreviation, or date) would otherwise build a
    // reminder with "? vs ?" or feed `undefined` into the series-key
    // builder. Skip + count it so partial feed drift is visible in
    // logs instead of silently breaking matching.
    const a = game.away?.abbreviation;
    const h = game.home?.abbreviation;
    if (!game.id || !a || !h || !game.date) {
      skippedMalformed += 1;
      continue;
    }
    const tipoffMs = Date.parse(game.date);
    if (!Number.isFinite(tipoffMs)) {
      skippedMalformed += 1;
      continue;
    }
    if (tipoffMs <= nowMs) continue; // already started
    if (tipoffMs - nowMs > MAX_LOOKAHEAD_MS) continue; // too far out
    upcoming.push({
      id: game.id,
      tipoffMs,
      title: `${a} vs ${h}`,
      ids: gameMatchIds(game),
    });
  }
  if (skippedMalformed > 0) {
    console.warn("reminders: skipped malformed feed rows", {
      count: skippedMalformed,
    });
  }

  if (upcoming.length === 0) {
    return NextResponse.json({ ok: true, upcoming: 0, sent: 0 });
  }

  const [subs, iosTokens] = await Promise.all([
    listSubscriptions(),
    listIosTokens(),
  ]);

  let sent = 0;
  let pruned = 0;
  const webpush = getWebPush();

  /** Minutes until tipoff, for the body copy. */
  const minutesTo = (tipoffMs: number) =>
    Math.max(1, Math.round((tipoffMs - nowMs) / 60000));

  /** Returns the games this subscriber should be reminded about right
   *  now: they follow it AND now is inside [tipoff - lead, tipoff). */
  function dueGames(alerts: SyncedAlert[], leadMinutes: number): UpcomingGame[] {
    const followIds = reminderFollowIds(alerts);
    if (followIds.size === 0) return [];
    const leadMs = leadMinutes * 60 * 1000;
    return upcoming.filter(
      (g) =>
        intersects(g.ids, followIds) && g.tipoffMs - nowMs <= leadMs
    );
  }

  // ── Web push ──────────────────────────────────────────────────────
  for (const sub of subs) {
    if (isWithinQuietHours(sub.quietHours, sub.timeZone, nowMs)) continue;
    const lead = sub.remindBeforeMinutes ?? DEFAULT_REMIND_MINUTES;
    for (const game of dueGames(sub.alerts, lead)) {
      try {
        const claimed = await claimDelivery(`${game.id}:reminder`, sub.endpoint);
        if (!claimed) continue; // already reminded this device
        const payload: PushPayload = {
          title: game.title,
          body: `Starts in ${minutesTo(game.tipoffMs)} min.`,
          url: `/game/${game.id}`,
          tag: `reminder-${game.id}`,
        };
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          encodePushPayload(payload)
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await removeSubscription(sub.endpoint);
          pruned += 1;
        }
      }
    }
  }

  // ── iOS APNs ──────────────────────────────────────────────────────
  for (const ios of iosTokens) {
    if (isWithinQuietHours(ios.quietHours, ios.timeZone, nowMs)) continue;
    const lead = ios.remindBeforeMinutes ?? DEFAULT_REMIND_MINUTES;
    for (const game of dueGames(ios.alerts, lead)) {
      try {
        const claimed = await claimDelivery(
          `${game.id}:reminder`,
          `apns:${ios.token.slice(0, 16)}`
        );
        if (!claimed) continue;
        const result = await sendApnsPush({
          deviceToken: ios.token,
          title: game.title,
          body: `Starts in ${minutesTo(game.tipoffMs)} min.`,
          collapseId: `reminder-${game.id}`,
          sandbox: false,
        });
        if (result.ok) {
          sent += 1;
        } else if (result.status === 410) {
          await removeIosToken(ios.token);
          pruned += 1;
        }
      } catch {
        /* best-effort; a missed reminder is non-fatal */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    upcoming: upcoming.length,
    sent,
    pruned,
  });
}
