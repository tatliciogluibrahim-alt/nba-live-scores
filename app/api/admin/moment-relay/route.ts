// POST /api/admin/moment-relay?moment=nfl-2026[&force=1]
// Bearer-protected (ADMIN_TOKEN or CRON_SECRET).
//
// The MANUAL trigger for the Moment Relay. Flip this when the moment is
// actually live (e.g. the NFL build ships). Sends ONE push to every armed
// device — web + iOS — deep-linking into the follow picker, then can never
// double-fire (a one-shot claim). Dead endpoints/tokens are pruned.
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     "https://nonoisescores.app/api/admin/moment-relay?moment=nfl-2026"

import { NextResponse } from "next/server";
import { requireAdminBearer } from "../../../lib/request-guards";
import {
  encodePushPayload,
  getWebPush,
  type PushPayload,
} from "../../../lib/push/web-push-config";
import {
  getSubscription,
  removeSubscription,
} from "../../../lib/push/subscription-store";
import { removeIosToken } from "../../../lib/push/ios-token-store";
import { sendApnsPush } from "../../../lib/push/apns-sender";
import {
  isRelayMoment,
  listArmedWeb,
  listArmedIos,
  claimMomentSend,
  releaseMomentSend,
  disarmWeb,
  disarmIos,
} from "../../../lib/push/moment-relay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One message per moment. Add here as new moments get a relay.
const RELAY_COPY: Record<string, PushPayload> = {
  "nfl-2026": {
    title: "NFL is ready.",
    body: "Pick your team and we'll take it from there.",
    url: "/following",
    tag: "relay-nfl-2026",
  },
};


export async function POST(req: Request) {
  if (!requireAdminBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const moment = url.searchParams.get("moment") ?? "";
  const force = url.searchParams.get("force") === "1";
  if (!isRelayMoment(moment)) {
    return NextResponse.json({ error: "Unknown moment" }, { status: 400 });
  }

  // One-shot: only the first trigger sends. `force=1` retries after a failed
  // fan-out (re-releases the claim first).
  if (force) await releaseMomentSend(moment);
  const claimed = await claimMomentSend(moment);
  if (!claimed) {
    return NextResponse.json({
      ok: true,
      alreadySent: true,
      note: "Relay already fired for this moment. Use ?force=1 to retry.",
    });
  }

  const payload = RELAY_COPY[moment];
  let encoded: string;
  try {
    encoded = encodePushPayload(payload);
  } catch (err) {
    await releaseMomentSend(moment); // let a fix retry
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "payload" },
      { status: 413 }
    );
  }

  let webDelivered = 0;
  let webPruned = 0;
  let iosDelivered = 0;
  let iosPruned = 0;

  try {
    // Web fan-out — resolve each armed endpoint to its stored keys.
    const webpush = getWebPush();
    const endpoints = await listArmedWeb(moment);
    await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const sub = await getSubscription(endpoint);
        if (!sub) {
          await disarmWeb(moment, endpoint);
          return;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            encoded
          );
          webDelivered += 1;
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await removeSubscription(endpoint);
            await disarmWeb(moment, endpoint);
            webPruned += 1;
          }
        }
      })
    );

    // iOS fan-out.
    const tokens = await listArmedIos(moment);
    await Promise.allSettled(
      tokens.map(async (token) => {
        const res = await sendApnsPush({
          deviceToken: token,
          title: payload.title,
          body: payload.body,
          collapseId: payload.tag,
          data: { url: payload.url ?? "/following" },
        });
        if (res.ok) {
          iosDelivered += 1;
        } else if (res.status === 410) {
          await removeIosToken(token);
          await disarmIos(moment, token);
          iosPruned += 1;
        }
      })
    );

    return NextResponse.json({
      ok: true,
      moment,
      web: { delivered: webDelivered, pruned: webPruned },
      ios: { delivered: iosDelivered, pruned: iosPruned },
    });
  } catch (err) {
    // A catastrophic failure — release the claim so a retry is possible.
    await releaseMomentSend(moment);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "send failed" },
      { status: 500 }
    );
  }
}
