// APNs (Apple Push Notification service) sender.
//
// Apple's modern token-based auth uses a JWT signed with an ES256
// elliptic-curve private key (the .p8 file generated in the Apple
// Developer portal). The same JWT can be reused for up to 60 minutes
// across many push sends — Apple rate-limits frequent JWT
// regeneration. We cache for 50 minutes to give buffer.
//
// Two APNs hosts:
//   • api.sandbox.push.apple.com — for development builds installed
//     via Xcode (entitlement aps-environment = "development")
//   • api.push.apple.com — for TestFlight and App Store builds
//     (entitlement aps-environment = "production")
//
// While the iOS app is being installed via Xcode debug, we default
// to sandbox. Once we ship to TestFlight, the entitlement flips and
// we'll route to production. Callers can override with the `sandbox`
// option.

import { SignJWT, importPKCS8 } from "jose";

const JWT_VALIDITY_MS = 50 * 60 * 1000; // 50 minutes, max is 60

let cachedJwt: { token: string; expiresAt: number } | null = null;

async function getApnsJwt(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) {
    return cachedJwt.token;
  }

  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKeyPem = process.env.APNS_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error(
      "APNs env vars missing. Set APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY."
    );
  }

  const privateKey = await importPKCS8(privateKeyPem, "ES256");

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(teamId)
    .setIssuedAt(Math.floor(now / 1000))
    .sign(privateKey);

  cachedJwt = { token: jwt, expiresAt: now + JWT_VALIDITY_MS };
  return jwt;
}

export type ApnsResult = {
  ok: boolean;
  status: number;
  body?: string;
  error?: string;
};

/** Send a single APNs push. Returns success/failure with status code.
 *  Caller is responsible for handling 410 Gone (token has expired —
 *  remove from store). Returns ok=true only on HTTP 200. */
export async function sendApnsPush(opts: {
  /** Hex APNs device token from the Capacitor push plugin. */
  deviceToken: string;
  /** Lock-screen title line. Keep short (one or two words ideally). */
  title: string;
  /** Lock-screen body line. */
  body: string;
  /** Whether to use APNs sandbox or production. Defaults to sandbox
   *  because this is being built against a Xcode debug install. Will
   *  flip when we ship to TestFlight. */
  sandbox?: boolean;
}): Promise<ApnsResult> {
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!bundleId) {
    return { ok: false, status: 0, error: "APNS_BUNDLE_ID missing" };
  }

  let jwt: string;
  try {
    jwt = await getApnsJwt();
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "JWT signing failed",
    };
  }

  const host =
    opts.sandbox !== false
      ? "api.sandbox.push.apple.com"
      : "api.push.apple.com";
  const url = `https://${host}/3/device/${opts.deviceToken}`;

  // Standard APNs alert payload. `aps.alert` is the visible
  // notification. `mutable-content: 1` lets us run a Notification
  // Service Extension later if we want to rewrite spoiler-safe bodies
  // on-device before display. Harmless to include now.
  const payload = {
    aps: {
      alert: { title: opts.title, body: opts.body },
      sound: "default",
      "mutable-content": 1,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { ok: true, status: res.status };
    }

    // Apple returns JSON in the body explaining why on 4xx/5xx.
    // Common cases: 400 BadDeviceToken, 403 ExpiredProviderToken,
    // 410 Unregistered (token has been invalidated and should be
    // removed from our store), 413 PayloadTooLarge.
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}
