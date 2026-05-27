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
    // Route through the HTTP/2-enabled undici Agent. Apple's APNs
    // servers won't accept HTTP/1.1 connections — that's why this
    // failed with a generic "fetch failed" using Node's native fetch.
    const res = await undiciFetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      dispatcher: apnsAgent,
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
    // Include the cause chain — undici nests the real network error
    // inside err.cause on connection failures.
    const msg = err instanceof Error ? err.message : "fetch failed";
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? ` (cause: ${err.cause.message})`
        : "";
    return {
      ok: false,
      status: 0,
      error: msg + cause,
    };
  }
}
