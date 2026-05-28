// Server-only Web Push setup. Lazy-initialized so the env vars are read
// once and bad config (missing keys) surfaces early with a clear error.
//
// Stage B (this file): VAPID-signed Web Push send. No subscription
// fanout, no game-state watcher — just the primitive used by the test
// endpoint and (later) the cron worker.

import webpush from "web-push";

let configured = false;

export const MAX_PUSH_PAYLOAD_BYTES = 4096;

function isValidVapidSubject(subject: string): boolean {
  try {
    const url = new URL(subject);
    return url.protocol === "mailto:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        "Web Push not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in env. See scripts/generate-vapid-keys.mjs."
      );
    }

    if (!isValidVapidSubject(subject)) {
      throw new Error("VAPID_SUBJECT must be a mailto: or https: URL.");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return webpush;
}

export type PushPayload = {
  /** Bold first line on the notification. */
  title: string;
  /** Body text. Keep short — iOS truncates ~110 chars on lock screen. */
  body: string;
  /** Where the notification deep-links when tapped. Defaults to "/". */
  url?: string;
  /** Group tag — newer notifications with the same tag replace older
   *  ones in the system tray. Useful for "score update" style pings. */
  tag?: string;
  /** Event type ("tipoff" | "eoq-2" | "final" | ...). Stashed in the
   *  notification data so the service worker can report an open back
   *  to /api/push/track-open, keyed by type. Powers per-event-type
   *  open-rate tracking (Phase 21C delivery loop). */
  eventType?: string;
};

export function encodePushPayload(payload: PushPayload): string {
  const encoded = JSON.stringify(payload);
  const bytes = Buffer.byteLength(encoded, "utf8");
  if (bytes > MAX_PUSH_PAYLOAD_BYTES) {
    throw new Error(
      `Push payload is ${bytes} bytes; iOS Web Push payloads must stay under ${MAX_PUSH_PAYLOAD_BYTES} bytes.`
    );
  }
  return encoded;
}
