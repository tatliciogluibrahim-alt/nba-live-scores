// Beta tester subscriber store. KV-backed, mirroring the Brief
// subscriber pattern. Stores a small list of friend-beta testers
// plus their structured feedback entries.
//
// Privacy model:
//   • Email is the only PII stored.
//   • Sport preferences are user-supplied, low-sensitivity.
//   • Feedback entries are free-text strings the user typed.

import { createHash, randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";

const BETA_INDEX_KEY = "nns:beta:subscribers:v1";
const BETA_KEY_PREFIX = "nns:beta:sub:v1:";
const FEEDBACK_KEY_PREFIX = "nns:beta:feedback:v1:";

export type BetaSubscriber = {
  email: string;
  /** Free-text "what sports do you follow" — for matching to the right
   *  wave. We don't validate this against a fixed list; people write
   *  things like "Knicks, USMNT, Phillies." */
  sportsInterest: string;
  /** Optional "how did you hear about it" — useful for figuring out
   *  which channels actually pull friends in. */
  source: string;
  /** Hashed key for lookup. */
  hash: string;
  /** Random token. Not security-critical; just an id. */
  id: string;
  createdAt: number;
};

export type BetaFeedback = {
  email: string;
  /** "what's working" / "what's broken" / "what's missing" — three
   *  free-text fields. */
  working: string;
  broken: string;
  missing: string;
  /** Optional one-line vibe summary. */
  vibe: string;
  createdAt: number;
};

function emailHash(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

function subscriberKey(hash: string): string {
  return `${BETA_KEY_PREFIX}${hash}`;
}

function feedbackKey(hash: string, createdAt: number): string {
  return `${FEEDBACK_KEY_PREFIX}${hash}:${createdAt}`;
}

/** Plain email shape check. Not RFC-strict — we just want to reject
 *  obvious garbage at the API boundary. The real validation is the
 *  user successfully receiving a follow-up DM/email from us. */
export function isPlausibleEmail(raw: string): boolean {
  const s = (raw ?? "").trim();
  if (s.length < 3 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function addBetaSubscriber(input: {
  email: string;
  sportsInterest: string;
  source: string;
}): Promise<BetaSubscriber> {
  const email = input.email.trim().toLowerCase();
  const hash = emailHash(email);
  const existing = await kv.get<BetaSubscriber>(subscriberKey(hash));
  if (existing) return existing;

  const record: BetaSubscriber = {
    email,
    sportsInterest: input.sportsInterest.slice(0, 200),
    source: input.source.slice(0, 200),
    hash,
    id: randomBytes(12).toString("base64url"),
    createdAt: Date.now(),
  };
  await kv.set(subscriberKey(hash), record);
  await kv.sadd(BETA_INDEX_KEY, hash);
  return record;
}

export async function listBetaSubscribers(): Promise<BetaSubscriber[]> {
  const hashes = (await kv.smembers(BETA_INDEX_KEY)) as string[];
  if (!hashes || hashes.length === 0) return [];
  const records = await Promise.all(
    hashes.map((h) => kv.get<BetaSubscriber>(subscriberKey(h)))
  );
  return records.filter((r): r is BetaSubscriber => r !== null);
}

export async function addBetaFeedback(input: {
  email: string;
  working: string;
  broken: string;
  missing: string;
  vibe: string;
}): Promise<BetaFeedback> {
  const email = input.email.trim().toLowerCase();
  const hash = emailHash(email);
  const record: BetaFeedback = {
    email,
    working: input.working.slice(0, 4000),
    broken: input.broken.slice(0, 4000),
    missing: input.missing.slice(0, 4000),
    vibe: input.vibe.slice(0, 500),
    createdAt: Date.now(),
  };
  await kv.set(feedbackKey(hash, record.createdAt), record);
  return record;
}

export async function betaSubscriberCount(): Promise<number> {
  return ((await kv.scard(BETA_INDEX_KEY)) as number) ?? 0;
}
