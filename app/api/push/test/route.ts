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
import {
  encodePushPayload,
  getWebPush,
  type PushPayload,
} from "../../../lib/push/web-push-config";
import {
  removeSubscription,
  upsertSubscription,
} from "../../../lib/push/subscription-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../../lib/push/request-guards";
import { validatePushSubscription } from "../../../lib/push/subscription-validation";
import type { PushSubscriptionJSON } from "../../../lib/push/web-push-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds — covers worst-case delayMs

const DEFAULT_PAYLOAD: PushPayload = {
  title: "Test push from No Noise Scores.",
  body: "If you see this with the app closed, push is wired end-to-end.",
  url: "/app",
  tag: "test-push",
};

const MAX_DELAY_MS = 25_000;

function cleanPayload(input: Partial<PushPayload> | undefined): Partial<PushPayload> {
  if (!input || typeof input !== "object") return {};
  const next: Partial<PushPayload> = {};
  if (typeof input.title === "string") next.title = input.title.slice(0, 120);
  if (typeof input.body === "string") next.body = input.body.slice(0, 240);
  if (typeof input.tag === "string") next.tag = input.tag.slice(0, 80);
  if (
    typeof input.url === "string" &&
    input.url.startsWith("/") &&
    !input.url.startsWith("//")
  ) {
    next.url = input.url.slice(0, 240);
  }
  return next;
}

function pushErrorStatus(err: unknown): number | undefined {
  return (err as { statusCode?: number })?.statusCode;
}

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateLimitRejection = await rejectRateLimited(req, "test");
  if (rateLimitRejection) return rateLimitRejection;

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

  const validation = validatePushSubscription(body?.subscription);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }
  const sub = validation.subscription;

  // Refresh the store entry so we know the device is still alive.
  await upsertSubscription(sub);

  const delayMs = Math.max(0, Math.min(MAX_DELAY_MS, body.delayMs ?? 0));
  const payload: PushPayload = { ...DEFAULT_PAYLOAD, ...cleanPayload(body.payload) };

  let encodedPayload: string;
  try {
    encodedPayload = encodePushPayload(payload);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        delivered: false,
        error: err instanceof Error ? err.message : "Push payload is too large.",
      },
      { status: 413 }
    );
  }

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
      encodedPayload
    );
    return NextResponse.json({ ok: true, delivered: true, delayMs });
  } catch (err) {
    // web-push throws on 4xx/5xx from the push service. 404/410 means
    // the subscription is gone — we drop it from the store so we don't
    // keep retrying a dead endpoint.
    const e = err as { statusCode?: number; body?: string; message?: string; headers?: Record<string, string> };
    const statusCode = pushErrorStatus(err);
    if (statusCode === 404 || statusCode === 410) {
      await removeSubscription(sub.endpoint);
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
    if (statusCode === 413) {
      return NextResponse.json(
        {
          ok: false,
          delivered: false,
          statusCode,
          error: "Push payload rejected as too large.",
        },
        { status: 413 }
      );
    }
    if (statusCode === 429) {
      const retryAfter = e.headers?.["retry-after"] ?? e.headers?.["Retry-After"];
      return NextResponse.json(
        {
          ok: false,
          delivered: false,
          statusCode,
          error: "Push service rate-limited this subscription.",
        },
        {
          status: 429,
          headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
        }
      );
    }
    if (statusCode === 400) {
      return NextResponse.json(
        {
          ok: false,
          delivered: false,
          statusCode,
          error: "Push service rejected the subscription or payload.",
        },
        { status: 400 }
      );
    }
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          ok: false,
          delivered: false,
          statusCode,
          error: "Push service rejected the VAPID credentials.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        delivered: false,
        statusCode,
        error: e?.message ?? "Push send failed.",
      },
      { status: 502 }
    );
  }
}
