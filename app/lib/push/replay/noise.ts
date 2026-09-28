// Noise metrics for replayed deliveries. "Noise" here is interruptions:
// every delivered push buzzes on iOS (APNs collapse-id replaces the card
// but still alerts), so the count and the busiest windows are what a
// follower actually feels. Cards left is what Notification Center shows
// after the game.

import { notificationStack, type ReplayDelivery } from "./replay-nfl";

export type NoiseStats = {
  pushes: number;
  /** Most pushes inside any 60-minute window. */
  busiest60m: number;
  /** Most pushes inside any 5-minute window. */
  busiest5m: number;
  /** Notification Center cards left after collapse. */
  cardsLeft: number;
};

/** Most timestamps inside any half-open window [t, t + windowMs). */
export function peakInWindow(times: number[], windowMs: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  let best = 0;
  let lo = 0;
  for (let hi = 0; hi < sorted.length; hi++) {
    while (sorted[hi] - sorted[lo] >= windowMs) lo += 1;
    best = Math.max(best, hi - lo + 1);
  }
  return best;
}

export function noiseStats(deliveries: ReplayDelivery[]): NoiseStats {
  const times = deliveries.map((d) => d.atMs);
  return {
    pushes: deliveries.length,
    busiest60m: peakInWindow(times, 60 * 60_000),
    busiest5m: peakInWindow(times, 5 * 60_000),
    cardsLeft: notificationStack(deliveries).length,
  };
}
