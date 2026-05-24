// Server-only Web Push setup. Lazy-initialized so the env vars are read
// once and bad config (missing keys) surfaces early with a clear error.
//
// Stage B (this file): VAPID-signed Web Push send. No subscription
// fanout, no game-state watcher — just the primitive used by the test
// endpoint and (later) the cron worker.

import webpush from "web-push";

let configured = false;

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
};
