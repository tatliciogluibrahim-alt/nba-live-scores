// Brief email subscriber store. KV-backed so subscribers survive
// cold starts + deploys. Each subscriber record carries a snapshot
// of their follows at signup time — when the daily cron runs it
// composes a per-user email based on what they follow.
//
// Privacy model:
//   • Email is the only PII stored.
//   • Follows are user-supplied, low-sensitivity.
//   • Unsubscribe token is random, single-use.
//   • Snapshotting follows at signup avoids needing the user's
//     device to be online when the cron runs.

import { createHash, randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";
import type { Follow } from "../../companion/state/types";

const SUBSCRIBER_INDEX_KEY = "nns:brief:subscribers:v1";
const SUBSCRIBER_KEY_PREFIX = "nns:brief:sub:v1:";
// Unsubscribe token → email index. One lookup per inbound unsubscribe
// click so we don't need to scan the whole subscriber list.
const UNSUB_TOKEN_PREFIX = "nns:brief:unsub:v1:";

export type BriefSubscriber = {
  email: string;
  /** Snapshot of follows at signup time. We don't try to track the
   *  user's device for live updates — they re-subscribe to refresh. */
  follows: Follow[];
  /** When true, scores show in the email. When false, scores are
   *  redacted and the email reads as "1 game wrapped" with a tap-to-
   *  reveal link back to the app. Defaults to true at signup. */
  includeScores: boolean;
  /** Random opaque token used to authenticate one-click unsubscribe
   *  links. Never re-issued — losing it means the user has to use
   *  the "resubscribe" flow from the app. */
  unsubscribeToken: string;
  createdAt: number;
};

function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function subscriberKey(email: string): string {
  return `${SUBSCRIBER_KEY_PREFIX}${emailHash(email)}`;
}

// Look up a subscriber record directly by its already-hashed key. Used
// by listSubscribers, which now iterates the index of hashes instead
// of raw emails (privacy hardening — see SUBSCRIBER_INDEX_KEY below).
function subscriberKeyByHash(hash: string): string {
  return `${SUBSCRIBER_KEY_PREFIX}${hash}`;
}

function unsubTokenKey(token: string): string {
  return `${UNSUB_TOKEN_PREFIX}${token}`;
}

/** Best-effort email shape validation. Real validation lives at the
 *  delivery layer (Resend will bounce invalid addresses); this just
 *  rejects the obvious garbage so we don't store junk. */
export function isPlausibleEmail(raw: string): boolean {
  const email = raw.trim();
  if (email.length < 5 || email.length > 254) return false;
  // Single @, at least one char on each side, at least one dot in
  // the domain. Doesn't try to be RFC-compliant.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function upsertSubscriber(
  raw: {
    email: string;
    follows: Follow[];
    includeScores?: boolean;
  }
): Promise<BriefSubscriber> {
  const email = raw.email.trim().toLowerCase();
  const existing = await getSubscriber(email);
  const unsubscribeToken =
    existing?.unsubscribeToken ?? randomBytes(24).toString("base64url");

  const next: BriefSubscriber = {
    email,
    follows: raw.follows ?? [],
    includeScores: raw.includeScores ?? true,
    unsubscribeToken,
    createdAt: existing?.createdAt ?? Date.now(),
  };

  // Write the unsubscribe-token key FIRST. A subscriber whose unsub
  // token isn't resolvable cannot be unsubscribed, which is a
  // CAN-SPAM / GDPR problem. If this write throws we abort before
  // creating the subscriber, so the half-written state never exists.
  // (For an existing subscriber re-upserting with the same token, this
  // is a harmless idempotent rewrite of the same value.)
  await kv.set(unsubTokenKey(unsubscribeToken), email);

  // Safe to write the subscriber and add to the index now. The index
  // stores the SHA-256 of the email (not the email itself) so a leaked
  // KV token can't surface the full mailing list via SMEMBERS. Matches
  // the pattern in app/lib/beta/subscriber-store.ts.
  await Promise.all([
    kv.set(subscriberKey(email), next),
    kv.sadd(SUBSCRIBER_INDEX_KEY, emailHash(email)),
  ]);
  return next;
}

export async function getSubscriber(
  email: string
): Promise<BriefSubscriber | null> {
  const value = await kv.get<BriefSubscriber>(subscriberKey(email));
  return value ?? null;
}

export async function getSubscriberByToken(
  token: string
): Promise<BriefSubscriber | null> {
  const email = await kv.get<string>(unsubTokenKey(token));
  if (!email) return null;
  return getSubscriber(email);
}

export async function removeSubscriber(email: string): Promise<boolean> {
  const existing = await getSubscriber(email);
  if (!existing) return false;
  await Promise.all([
    kv.del(subscriberKey(email)),
    kv.del(unsubTokenKey(existing.unsubscribeToken)),
    // Index now stores hashes (privacy hardening). Hash on remove
    // too so srem actually matches.
    kv.srem(SUBSCRIBER_INDEX_KEY, emailHash(email)),
  ]);
  return true;
}

export async function listSubscribers(): Promise<BriefSubscriber[]> {
  // Index members are SHA-256 hashes of the email. Read each
  // subscriber record by hash; the full email lives inside the
  // record value, not in the index.
  const hashes = await kv.smembers<string[]>(SUBSCRIBER_INDEX_KEY);
  if (hashes.length === 0) return [];
  const rows = await Promise.all(
    hashes.map((h) => kv.get<BriefSubscriber>(subscriberKeyByHash(h)))
  );
  return rows.filter((r): r is BriefSubscriber => Boolean(r));
}

export async function subscriberCount(): Promise<number> {
  return kv.scard(SUBSCRIBER_INDEX_KEY);
}
