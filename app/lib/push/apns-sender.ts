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
import { Agent, fetch as undiciFetch } from "undici";

// APNs requires HTTP/2. Node's native fetch (powered by undici)
// negotiates HTTP/1.1 by default — the TLS handshake to
// api.sandbox.push.apple.com succeeds but the request hangs or fails
// with a generic "fetch failed" because Apple won't accept HTTP/1.1.
// Switching to an undici Agent with allowH2: true forces the dispatcher
// to negotiate HTTP/2 via ALPN, which Apple accepts.
//
// Single agent reused across calls — cheap, reuses TLS sessions.
const apnsAgent = new Agent({ allowH2: true });

const JWT_VALIDITY_MS = 50 * 60 * 1000; // 50 minutes, max is 60

let cachedJwt: { token: string; expiresAt: number } | null = null;

/** Normalize a .p8 / PEM private key coming from a Vercel-style env
 *  var. Vercel's UI throws "the value has return characters" if you
 *  paste a multi-line PEM directly, so the recommended pattern is to
 *  base64-encode the entire .p8 file on the client and paste the
 *  single-line base64. We accept either format here.
 *
 *  Common corruption modes handled:
 *
 *   1. Base64-encoded whole-file: when we detect no PEM markers in
 *      the raw value AND it base64-decodes to something that DOES
 *      have PEM markers, use the decoded form. This is the
 *      recommended Vercel storage format.
 *   2. Escaped newlines: "-----BEGIN...\nMIGT\n-----END..." gets
 *      stored as literal `\n` sequences, not real newlines. We unescape.
 *   3. Surrounding whitespace / BOM from copy-paste.
 *   4. Missing PEM armor on a base64 BODY (no headers, no envelope):
 *      add the -----BEGIN/END PRIVATE KEY----- envelope and chunk
 *      the base64 into 64-char lines per RFC 7468.
 *
 *  After this normalization, jose's importPKCS8 can parse anything
 *  Apple's .p8 download produces, no matter how the user pasted it. */
function normalizeApnsPrivateKey(raw: string): string {
  let key = raw.trim();
  // Strip a UTF-8 BOM if pasted from a Windows text editor.
  if (key.charCodeAt(0) === 0xfeff) key = key.slice(1);
  // Unescape literal "\n" sequences. Vercel's env var input handles
  // multi-line paste correctly *when* real newlines are sent, but
  // some clipboards / scripts send them as the two-character string
  // `\n` instead.
  if (key.includes("\\n") && !key.includes("\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  // Base64-encoded whole-file case. The cleanest way to store a
  // multi-line PEM in Vercel is to base64-encode the entire file on
  // the client (`base64 -i AuthKey_*.p8 | pbcopy`). The stored value
  // is a single line of base64 with no special characters, which
  // Vercel never complains about. Server-side, we detect this by:
  //   • No PEM markers in the raw value
  //   • Looks like base64 (no whitespace, valid alphabet)
  //   • Decodes to something that DOES contain PEM markers
  if (!key.includes("-----BEGIN") && /^[A-Za-z0-9+/=\r\n]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key.replace(/\s+/g, ""), "base64").toString(
        "utf8"
      );
      if (decoded.includes("-----BEGIN")) {
        key = decoded.trim();
      }
    } catch {
      // Fall through to the bare-body branch below.
    }
  }
  // Bare-base64-body case (no headers, no envelope). Apple always
  // includes the armor in the .p8 download, but a hand-stripped
  // paste might not.
  if (!key.includes("-----BEGIN")) {
    const base64 = key.replace(/\s+/g, "");
    const chunks = base64.match(/.{1,64}/g) ?? [base64];
    key =
      "-----BEGIN PRIVATE KEY-----\n" +
      chunks.join("\n") +
      "\n-----END PRIVATE KEY-----";
  }
  return key;
}

async function getApnsJwt(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) {
    return cachedJwt.token;
  }

  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const rawKey = process.env.APNS_PRIVATE_KEY;

  if (!teamId || !keyId || !rawKey) {
    throw new Error(
      "APNs env vars missing. Set APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY."
    );
  }

  const privateKeyPem = normalizeApnsPrivateKey(rawKey);

  let privateKey;
  try {
    privateKey = await importPKCS8(privateKeyPem, "ES256");
  } catch (err) {
    // Give better diagnostics — without these the error is just
    // "must be PKCS#8 formatted string" which doesn't say WHY.
    const sample = privateKeyPem.slice(0, 30).replace(/\n/g, "\\n");
    const looksLikePem = privateKeyPem.startsWith("-----BEGIN");
    const hasNewlines = privateKeyPem.includes("\n");
    throw new Error(
      `APNS_PRIVATE_KEY failed to parse as PKCS#8. ` +
        `length=${privateKeyPem.length}, ` +
        `looksLikePem=${looksLikePem}, ` +
        `hasNewlines=${hasNewlines}, ` +
        `sample="${sample}…". ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

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
  /** Which host actually accepted (or was last tried). Lets callers
   *  learn a token's true environment and cache it. */
  environment?: "production" | "sandbox";
};

const PROD_HOST = "api.push.apple.com";
const SANDBOX_HOST = "api.sandbox.push.apple.com";

/** Apple reports an environment mismatch a few different ways depending
 *  on whether it's the device token or the signing key that's scoped to
 *  the wrong environment. Any of these means "try the other endpoint."
 *
 *   • 400 BadDeviceToken          — token minted for the other env
 *   • 403 BadEnvironmentKeyInToken — .p8 auth key scoped to the other env
 *
 * The launch-night bug: the TestFlight build shipped with
 * aps-environment=development, so it minted SANDBOX device tokens, but
 * the dispatcher targeted production. Apple returned
 * 403 BadEnvironmentKeyInToken. Rather than hardcode an environment that
 * breaks the moment the entitlement flips for the App Store build, we
 * try the preferred host and transparently retry the other on these
 * errors. Correct for every build flavor with zero config. */
function isEnvironmentMismatch(status: number, body: string | undefined): boolean {
  if (status !== 400 && status !== 403) return false;
  const b = body ?? "";
  return (
    b.includes("BadDeviceToken") || b.includes("BadEnvironmentKeyInToken")
  );
}

/** Send a single APNs push. Returns success/failure with status code.
 *  Caller is responsible for handling 410 Gone (token has expired —
 *  remove from store). Returns ok=true only on HTTP 200. */
export async function sendApnsPush(opts: {
  /** Hex APNs device token from the Capacitor push plugin. */
  deviceToken: string;
  /** Lock-screen title line. Keep short (one or two words ideally). */
  title: string;
  /** Optional secondary heading. When present, iOS uses this in place
   *  of the awkward "from <App Name>" line it would otherwise show on
   *  the condensed lock-screen stack view. */
  subtitle?: string;
  /** Lock-screen body line. */
  body: string;
  /** apns-collapse-id header — newer notifications with the same id
   *  replace older ones in the Notification Center stack instead of
   *  piling up. Match the dispatcher's `tag` shape so web and native
   *  collapse identically. */
  collapseId?: string;
  /** Whether to use APNs sandbox or production. Defaults to sandbox
   *  because this is being built against a Xcode debug install. Will
   *  flip when we ship to TestFlight. */
  sandbox?: boolean;
  /** Diagnostics only: when true, do NOT auto-retry the other
   *  environment. Lets the test endpoint see each environment's raw
   *  result in isolation. */
  noFallback?: boolean;
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

  // Standard APNs alert payload. `aps.alert` is the visible
  // notification. `mutable-content: 1` lets us run a Notification
  // Service Extension later if we want to rewrite spoiler-safe bodies
  // on-device before display. Harmless to include now.
  //
  // `subtitle` is the iOS-native way to display a secondary heading;
  // setting it also displaces the "from <App>" attribution iOS would
  // otherwise insert between title and body on the lock screen.
  const alert: Record<string, string> = {
    title: opts.title,
    body: opts.body,
  };
  if (opts.subtitle) alert.subtitle = opts.subtitle;
  const payload = {
    aps: {
      alert,
      sound: "default",
      "mutable-content": 1,
    },
  };
  const headers: Record<string, string> = {
    authorization: `bearer ${jwt}`,
    "apns-topic": bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
    "content-type": "application/json",
  };
  // Collapse-id ensures repeated event updates (multiple score pings
  // for the same game) replace the previous notification instead of
  // stacking — Apple caps the header at 64 ASCII chars.
  if (opts.collapseId) {
    headers["apns-collapse-id"] = opts.collapseId.slice(0, 64);
  }
  const path = `/3/device/${opts.deviceToken}`;
  const bodyJson = JSON.stringify(payload);

  // Preferred environment first; auto-retry the other on a mismatch.
  const preferProd = opts.sandbox === false;
  const first = preferProd ? PROD_HOST : SANDBOX_HOST;
  const second = preferProd ? SANDBOX_HOST : PROD_HOST;

  const r1 = await apnsHttp(first, path, headers, bodyJson);
  if (opts.noFallback || r1.ok || !isEnvironmentMismatch(r1.status, r1.body)) {
    return { ...r1, environment: first === PROD_HOST ? "production" : "sandbox" };
  }
  // Environment mismatch — the token belongs to the other APNs env.
  const r2 = await apnsHttp(second, path, headers, bodyJson);
  return { ...r2, environment: second === PROD_HOST ? "production" : "sandbox" };
}

/** One HTTP/2 POST to a specific APNs host. No retry logic — the
 *  callers layer environment fallback on top. */
async function apnsHttp(
  host: string,
  path: string,
  headers: Record<string, string>,
  body: string
): Promise<ApnsResult> {
  try {
    const res = await undiciFetch(`https://${host}${path}`, {
      method: "POST",
      headers,
      body,
      dispatcher: apnsAgent,
    });
    if (res.ok) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? ` (cause: ${err.cause.message})`
        : "";
    return { ok: false, status: 0, error: msg + cause };
  }
}

// ── Live Activity (ActivityKit) push ─────────────────────────────────
//
// Live Activities are updated/ended via APNs with the special
// `liveactivity` push type and a topic suffix of `.push-type.liveactivity`.
// The token here is the per-Activity *push token* the device hands us when
// it starts the activity (NOT the device token used for alerts above).
//
// Payload shape (Apple's ActivityKit remote-push contract):
//   aps: {
//     timestamp,                      // seconds, when this update was made
//     event: "start" | "update" | "end",
//     "content-state": { ... },       // must match the Swift ContentState
//     "attributes-type": "...",       // start only
//     attributes: { ... },            // start only (push-to-start, iOS 17.2+)
//     "stale-date": seconds,          // optional: when the UI goes stale
//     "dismissal-date": seconds,      // end only: when to remove from LS
//   }
//
// The Swift side (ContentState / ActivityAttributes) is defined in the
// Widget Extension — see docs/LIVE_ACTIVITY_BUILD.md. Keep this shape and
// that struct in lockstep.

/** Decoded by the Swift `ContentState`. Flat + JSON-friendly. */
export type LiveActivityContentState = {
  awayCode: string;
  awayScore: number;
  homeCode: string;
  homeScore: number;
  /** Live status line, e.g. "Q3 · 4:21" or "Final". */
  statusLine: string;
  /** One-line stake / context, e.g. "OKC chasing the close-out." */
  subline: string;
  /** Sport accent hex, e.g. "#e55b2a". */
  accentHex: string;
  /** Stadium Panel progress rail, 0...1. Computed by
   *  computeLiveActivityProgress(sport, statusLine, status) on every
   *  push. The Swift ContentState is non-optional — omitting this field
   *  will fail Codable decode and the activity won't update. */
  progress: number;
};

/** Set once when starting via push-to-start. Decoded by `ActivityAttributes`. */
export type LiveActivityAttributes = {
  matchup: string; // "OKC vs SA"
  stage: string; // "NBA · Game 6"
  sport: string; // "nba" | "wc" | "nfl"
};

export async function sendApnsLiveActivity(opts: {
  /** The per-Activity push token from the device (hex). */
  pushToken: string;
  event: "start" | "update" | "end";
  contentState: LiveActivityContentState;
  /** Required for `event: "start"` (push-to-start). */
  attributes?: LiveActivityAttributes;
  /** epoch seconds — when the live UI should be treated as stale. */
  staleDate?: number;
  /** epoch seconds — when to remove the ended activity from the lock
   *  screen. `end` only. Defaults to "soon" on the device if omitted. */
  dismissalDate?: number;
  /** 10 = immediate (use for score changes). 5 = throttled. Default 10. */
  priority?: 5 | 10;
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

  const aps: Record<string, unknown> = {
    timestamp: Math.floor(Date.now() / 1000),
    event: opts.event,
    "content-state": opts.contentState,
  };
  if (opts.event === "start" && opts.attributes) {
    aps["attributes-type"] = "NoNoiseGameAttributes";
    aps.attributes = opts.attributes;
  }
  if (opts.staleDate) aps["stale-date"] = opts.staleDate;
  if (opts.event === "end" && opts.dismissalDate) {
    aps["dismissal-date"] = opts.dismissalDate;
  }

  const headers = {
    authorization: `bearer ${jwt}`,
    "apns-topic": `${bundleId}.push-type.liveactivity`,
    "apns-push-type": "liveactivity",
    "apns-priority": String(opts.priority ?? 10),
    "content-type": "application/json",
  };
  const path = `/3/device/${opts.pushToken}`;
  const bodyJson = JSON.stringify({ aps });

  // Same environment auto-fallback as sendApnsPush. The per-Activity
  // push token carries the build's APNs environment, so a build signed
  // with aps-environment=development mints sandbox Live Activity tokens
  // even on TestFlight — try the preferred host, retry the other on a
  // mismatch.
  const preferProd = opts.sandbox === false;
  const first = preferProd ? PROD_HOST : SANDBOX_HOST;
  const second = preferProd ? SANDBOX_HOST : PROD_HOST;

  const r1 = await apnsHttp(first, path, headers, bodyJson);
  if (r1.ok || !isEnvironmentMismatch(r1.status, r1.body)) {
    return { ...r1, environment: first === PROD_HOST ? "production" : "sandbox" };
  }
  const r2 = await apnsHttp(second, path, headers, bodyJson);
  return { ...r2, environment: second === PROD_HOST ? "production" : "sandbox" };
}
