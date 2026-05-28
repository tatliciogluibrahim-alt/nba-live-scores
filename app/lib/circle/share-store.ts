// Share-code store for multi-device follow transfer (Phase 21C).
//
// Model: a "share code" maps to a snapshot of one device's follows.
// Device A POSTs its follows → gets a short code. Device B GETs the
// code → merges the follows into its own local list. No accounts, no
// live sync — a one-time pull. Good enough for friend-beta and the
// foundation the Sports Circle prototype builds on.
//
// Privacy: we store only { kind, id } per follow — never alert tiers,
// noSpoilers, or any device identifier. The receiving device applies
// its own default tier when it adds each follow. Snapshots are
// ephemeral (24h TTL) so a code is a short-lived transfer token, not
// durable storage.

import { kv } from "@vercel/kv";

const PREFIX = "nns:circle:share:";
const TTL_SECONDS = 24 * 60 * 60; // codes expire after a day

// 6-char codes from an unambiguous alphabet (no 0/O/1/I/L). ~1.07B
// combinations — collisions are astronomically unlikely at our scale,
// and createShareSnapshot retries on the off chance.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export type SharedFollow = { kind: string; id: string };

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function keyFor(code: string): string {
  return `${PREFIX}${code.toUpperCase()}`;
}

/** Persist a follows snapshot under a fresh code. Returns the code.
 *  Retries a few times on the (vanishingly unlikely) collision. */
export async function createShareSnapshot(
  follows: SharedFollow[]
): Promise<string> {
  // Normalize + clamp to a sane upper bound so a malicious caller can't
  // stuff arbitrary data into KV.
  const clean = follows
    .filter(
      (f) =>
        f &&
        typeof f.kind === "string" &&
        typeof f.id === "string" &&
        f.kind.length <= 16 &&
        f.id.length <= 48
    )
    .slice(0, 50)
    .map((f) => ({ kind: f.kind, id: f.id }));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const key = keyFor(code);
    const existing = await kv.get(key);
    if (existing) continue; // collision — try another code
    await kv.set(key, { follows: clean }, { ex: TTL_SECONDS });
    return code;
  }
  // Extremely unlikely. Fall back to a timestamped code rather than throw.
  const fallback = randomCode() + randomCode().slice(0, 2);
  await kv.set(keyFor(fallback), { follows: clean }, { ex: TTL_SECONDS });
  return fallback;
}

/** Read a snapshot by code. Returns null when the code is unknown or
 *  expired. */
export async function readShareSnapshot(
  code: string
): Promise<SharedFollow[] | null> {
  if (!code || !/^[A-Za-z0-9]{4,12}$/.test(code)) return null;
  const stored = await kv.get<{ follows: SharedFollow[] }>(keyFor(code));
  if (!stored || !Array.isArray(stored.follows)) return null;
  return stored.follows;
}
