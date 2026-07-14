import { kv } from "@vercel/kv";
import { deriveChampionFromFixtures, type WCChampion } from "./wc-champion";
import type { WCScheduleFixture } from "../api/world-cup/schedule/route";

// Server-only champion store. Kept separate from wc-champion.ts (which the
// client bracket imports) so @vercel/kv never lands in a client bundle.
//
// Forward-only: the champion is written once when the final is first
// decided and never overwritten. The schedule route owns the freeze (it
// carries ESPN's per-side winner flag); the live 14-day route only reads,
// so Today can still name the champion after the final ages out of its
// window.

const CHAMPION_KEY = "nns:wc:champion:2026";

/** Read the frozen champion, or null. Never writes. */
export async function readFrozenChampion(): Promise<WCChampion | null> {
  try {
    return (await kv.get<WCChampion>(CHAMPION_KEY)) ?? null;
  } catch {
    return null; // KV absent (local dev) — no persistent champion
  }
}

/** Return the champion, freezing it write-once on first resolve. A stored
 *  champion always wins (never overwritten). Null until the final is
 *  decided by trusted data. */
export async function resolveFrozenChampion(
  fixtures: WCScheduleFixture[],
  now: number
): Promise<WCChampion | null> {
  const stored = await readFrozenChampion();
  if (stored) return stored;
  const derived = deriveChampionFromFixtures(fixtures, now);
  if (!derived) return null;
  try {
    await kv.set(CHAMPION_KEY, derived); // no expiry — write-once
  } catch {
    // Best-effort: a failed freeze just re-derives on the next build.
  }
  return derived;
}
