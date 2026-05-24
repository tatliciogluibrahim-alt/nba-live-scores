// POST /api/push/test
// Body: { subscription: PushSubscriptionJSON, delayMs?: number, payload?: PushPayload }
//
// Fires a real Web Push to the device that POSTs its own subscription.
// This is the "is the wire actually working?" endpoint — call it from
// Settings, optionally close the app, and confirm the notification
// arrives even with the app backgrounded.
//
// `delayMs` (optional, default 0, max 25000) lets the caller defer the
// send so they can close the app first and verify push-while-closed.
// Capped at 25s so we stay under typical serverless function limits.

import { NextResponse } from "next/server";
import { getWebPush, type PushPayload } from "../../../lib/push/web-push-config";
import { upsertSubscription } from "../../../lib/push/subscription-store";
import type { PushSubscriptionJSON } from "../../../lib/push/web-push-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds — covers worst-case delayMs

const DEFAULT_PAYLOAD: PushPayload = {
  title: "Test push from No Noise Scores.",
  body: "If you see this with the app closed, push is wired end-to-end.",
  url: "/",
  tag: "test-push",
};

const MAX_DELAY_MS = 25_000;

export async function POST(req: Request) {
  let body: {
    subscription?: PushSubscriptionJSON;
    delayMs?: number;
    payload?: Partial<PushPayload>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body?.subscription;
  if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: "Subscription missing endpoint or keys." },
      { status: 400 }
    );
  }

  // Refresh the store entry so we know the device is still alive.
  upsertSubscription(sub);

  const delayMs = Math.max(0, Math.min(MAX_DELAY_MS, body.delayMs ?? 0));
  const payload: PushPayload = { ...DEFAULT_PAYLOAD, ...(body.payload ?? {}) };

  try {
    const webpush = getWebPush();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      },
      JSON.stringify(payload)
    );
    return NextResponse.json({ ok: true, delivered: true, delayMs });
  } catch (err) {
    // web-push throws on 4xx/5xx from the push service. 404/410 means
    // the subscription is gone — we drop it from the store so we don't
    // keep retrying a dead endpoint.
    const e = err as { statusCode?: number; body?: string; message?: string };
    if (e?.statusCode === 404 || e?.statusCode === 410) {
      return NextResponse.json(
        {
          ok: false,
          delivered: false,
          gone: true,
          error: "Subscription expired or revoked.",
        },
        { status: 410 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        delivered: false,
        statusCode: e?.statusCode,
        error: e?.message ?? "Push send failed.",
      },
      { status: 502 }
    );
  }
}
