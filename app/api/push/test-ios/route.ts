// GET /api/push/test-ios?token=<apns-hex-prefix>
//
// Fires a REAL APNs alert push to the matching device token, to the
// PRODUCTION endpoint (api.push.apple.com), and returns Apple's actual
// HTTP status + body. This is the "is APNs wired end-to-end?" probe.
//
// Built launch night when notifications never arrived on a correctly
// registered native install. The /api/push/inspect endpoint proved the
// token + follows were in KV, but we couldn't tell WHY delivery failed
// (sandbox-vs-production mismatch? missing APNS_* env vars? wrong bundle
// id?) without seeing Apple's response. This endpoint surfaces it.
//
// GET so it can be triggered from a phone browser by pasting the token
// prefix shown in Settings > PUSH ON THIS DEVICE > Diagnostics. The
// device token is a device-held credential that grants no useful
// capability on its own, so accepting it as a query param is acceptable
// for a diagnostic. Match is by prefix (min 8 chars).
//
// Returns, for the matched token:
//   • apnsStatus  — 200 on success, or Apple's 4xx with the reason body
//   • apnsBody    — Apple's JSON reason (e.g. {"reason":"BadDeviceToken"})
//   • apnsError   — transport error (e.g. JWT signing failed, env missing)
// A 200 here means the push left for Apple successfully; check the
// device for the actual banner.

import { NextResponse } from "next/server";
import { listIosTokens } from "../../../lib/push/ios-token-store";
import { sendApnsPush } from "../../../lib/push/apns-sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("token") ?? "").trim().toLowerCase();
  if (!q || q.length < 8) {
    return NextResponse.json(
      { error: "Provide ?token=<apns-hex-prefix>. Min 8 chars." },
      { status: 400 }
    );
  }

  // Allow forcing sandbox for an Xcode debug build:
  //   ?token=...&sandbox=1
  const sandbox = url.searchParams.get("sandbox") === "1";

  const allTokens = await listIosTokens();
  const match = allTokens.find((t) => t.token.toLowerCase().startsWith(q));
  if (!match) {
    return NextResponse.json(
      {
        error: "No iOS token matches that prefix.",
        hint: "Grab the prefix from Settings > PUSH ON THIS DEVICE > Diagnostics > token:",
        iosTokensTotal: allTokens.length,
      },
      { status: 404 }
    );
  }

  const result = await sendApnsPush({
    deviceToken: match.token,
    title: "Test push · No Noise Scores",
    body: "If you see this, APNs is wired end to end.",
    sandbox,
  });

  // Surface the env-var presence (booleans only, never values) so a
  // missing APNS_* config is obvious in the response.
  const envPresent = {
    APNS_TEAM_ID: Boolean(process.env.APNS_TEAM_ID),
    APNS_KEY_ID: Boolean(process.env.APNS_KEY_ID),
    APNS_PRIVATE_KEY: Boolean(process.env.APNS_PRIVATE_KEY),
    APNS_BUNDLE_ID: Boolean(process.env.APNS_BUNDLE_ID),
  };

  return NextResponse.json({
    sentTo: `${match.token.slice(0, 12)}…`,
    targetedEndpoint: sandbox ? "sandbox" : "production",
    apnsOk: result.ok,
    apnsStatus: result.status,
    apnsBody: result.body ?? null,
    apnsError: result.error ?? null,
    envPresent,
    note: result.ok
      ? "Push accepted by Apple. Check the device for the banner."
      : "Apple rejected the push. See apnsBody / apnsError for why.",
  });
}
