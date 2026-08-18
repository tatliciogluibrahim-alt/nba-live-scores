// Preseason delivery gate (Phase 22).
//
// Preseason pushes are out of scope for Phase 22 (docs/nfl-design.md): a
// follower who turned alerts on for the September opener must not be woken
// by an August exhibition game. NFL follows have carried `alertEnabled`
// since activation (2026-07-20), so "no audience exists yet" was never the
// gate — this is.
//
// Detection still runs on preseason games (that IS the gate-4 verification
// against live data). Only fan-out is held.

/** ESPN season types: 1 preseason · 2 regular · 3 postseason. */
export const NFL_PRESEASON_SEASON_TYPE = 1;

/** Ids of the games whose events must never reach a device this phase. */
export function heldPreseasonGameIds(
  games: readonly { id: string; seasonType: number }[]
): Set<string> {
  return new Set(
    games
      .filter((g) => g.seasonType === NFL_PRESEASON_SEASON_TYPE)
      .map((g) => g.id)
  );
}

/** Split detected events into what may be delivered and what is held. */
export function partitionPreseasonEvents<T extends { gameId: string }>(
  events: readonly T[],
  heldGameIds: ReadonlySet<string>
): { sendable: T[]; held: T[] } {
  const sendable: T[] = [];
  const held: T[] = [];
  for (const e of events) {
    (heldGameIds.has(e.gameId) ? held : sendable).push(e);
  }
  return { sendable, held };
}
