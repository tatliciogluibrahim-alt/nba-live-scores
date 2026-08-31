// Scan relevance gate — decides whether a game needs KV state work this
// cron tick. The scan crons run every minute, 24/7, and the upstream
// feeds return a rolling multi-day window of fixtures. Reading and
// writing per-game KV state for every far-future fixture on every tick
// is what exhausted the Upstash free-tier command budget (500K/month).
//
// A game only needs state tracking when something can transition:
//   • live            → always (scores, quarters/minutes, final).
//   • upcoming SOON   → so we hold a prev=upcoming state to detect the
//                       tipoff/kickoff transition. 30 min of lead is far
//                       more than the 1-minute tick cadence needs.
//   • final RECENTLY  → so the live→final tick fires the final event and
//                       saves the snapshot. After ~5h the game has long
//                       since gone final; its 6h state TTL drops it.
//
// Everything else — fixtures days away, finals from yesterday — is
// skipped entirely: no read, no write. Overnight and off-hours ticks
// become nearly free, and the dense WC fixture window stops costing a
// read+write per fixture per minute.
//
// The decision uses only the fresh feed data (status + kickoff date), so
// it costs zero KV commands to make.

// Process an upcoming game once it's within this long of kickoff.
const UPCOMING_LEAD_MS = 30 * 60 * 1000;
// Keep processing a final game this long after its scheduled start, to
// cover the live→final transition tick and a short tail. NBA games run
// ~2.5h, WC ~2h; 5h comfortably covers either plus pre-game drift.
// 8h, not 5 (Preseason Review #3): an NFL game with a weather delay can
// finish 6-7 hours after its scheduled start, and dropping it early
// means the live->final tick — and the final alert — never fires.
const FINAL_LOOKBACK_MS = 8 * 60 * 60 * 1000;

export function isStateRelevant(
  status: "live" | "upcoming" | "final",
  dateISO: string | undefined,
  nowMs: number
): boolean {
  if (status === "live") return true;

  const startMs = dateISO ? Date.parse(dateISO) : NaN;
  // No/invalid date → don't silently drop the game; process it. Both
  // feeds default `date` to now() when ESPN omits it, so an upcoming
  // game with a missing date still falls inside the lead window below.
  if (!Number.isFinite(startMs)) return true;

  if (status === "upcoming") return startMs <= nowMs + UPCOMING_LEAD_MS;
  // final
  return nowMs - startMs <= FINAL_LOOKBACK_MS;
}
