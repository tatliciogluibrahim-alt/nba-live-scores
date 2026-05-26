// POST /api/admin/push/test-message
// Bearer-protected (ADMIN_TOKEN or CRON_SECRET).
//
// Send a freeform notification with a custom title + body to every
// subscribed device. Useful for "is push still working right now?"
// smoke tests without inventing a fake game event.
//
// Unlike /api/admin/push/test-event, this skips the dispatcher (no
// reverse-index lookup, no preset matching) and sends to *every*
// subscription in the store. Skips dedupe entirely (each call gets a
// unique tag). Dead endpoints (404/410) are pruned as a side effect.
//
// Query params (all optional):
//   title  — notification title (max 120 chars)
//   body   — notification body  (max 240 chars)
//   url    — deep link (must start with `/`, defaults to `/`)
//
// Example:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     "https://nonoisescores.app/api/admin/push/test-message?title=Hello&body=this+is+just+a+test"

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  encodePushPayload,
  getWebPush,
  type PushPayload,
} from "../../../../lib/push/web-push-config";
import {
  listSubscriptions,
  removeSubscription,
  upsertSubscription,
} from "../../../../lib/push/subscription-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length).trim());

  for (const envName of ["ADMIN_TOKEN", "CRON_SECRET"]) {
    const expected = process.env[envName];
    if (!expected) continue;
    const b = Buffer.from(expected);
    if (provided.length !== b.length) continue;
    if (timingSafeEqual(provided, b)) return true;
  }
  return false;
}

function sanitizeUrl(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw.slice(0, 240);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const titleParam = url.searchParams.get("title");
  const bodyParam = url.searchParams.get("body");

  const payload: PushPayload = {
    title: (titleParam ?? "No Noise Scores · Test").slice(0, 120),
    body: (bodyParam ?? "This is just a test.").slice(0, 240),
    url: sanitizeUrl(url.searchParams.get("url")),
    // Unique tag so iOS doesn't coalesce repeated test pushes into
    // one — every send shows up as a new notification on the lock
    // screen, which is what you want when smoke-testing.
    tag: `test-msg-${Date.now()}`,
  };

  let encoded: string;
  try {
    encoded = encodePushPayload(payload);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "payload-too-large",
      },
      { status: 413 }
    );
  }

  try {
    const subs = await listSubscriptions();
    if (subs.length === 0) {
      return NextResponse.json({
        ok: true,
        delivered: 0,
        skipped: 0,
        pruned: 0,
        payload,
        note: "No subscriptions registered.",
      });
    }

    const webpush = getWebPush();
    let pruned = 0;

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            encoded
          );
          await upsertSubscription({ endpoint: sub.endpoint, keys: sub.keys });
          return { delivered: true, reason: null as string | null };
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await removeSubscription(sub.endpoint);
            pruned += 1;
            return { delivered: false, reason: "gone" };
          }
          return {
            delivered: false,
            reason: `push-failed-${statusCode ?? "?"}`,
          };
        }
      })
    );

    const deliveries = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { delivered: false, reason: "exception" }
    );
    const delivered = deliveries.filter((d) => d.delivered).length;
    const skipped = deliveries.filter((d) => !d.delivered).length;

    return NextResponse.json({
      ok: true,
      delivered,
      skipped,
      pruned,
      payload,
      deliveries,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "send failed",
      },
      { status: 500 }
    );
  }
}
