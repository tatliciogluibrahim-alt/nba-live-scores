import record from "./wc-record-2026.json";
import type { WCSchedulePayload } from "../api/world-cup/schedule/route";

// The Summer Soccer 2026 record, frozen after the final: 104 matches from
// June 11 to July 19, the twelve final group tables, and the champion
// (Spain 1, Argentina 0, after extra time). Captured from production's
// /api/world-cup/schedule on 2026-08-30, while ESPN still served the
// tournament.
//
// It is the source for every Summer Soccer surface now. ESPN's scoreboard
// stopped answering date-range queries for the tournament (0 events per
// range, found 2026-10-11), which left the bracket and country pages empty
// in production. Locked: never edited, pinned by wc-record-2026.test.ts.

export function wcRecord2026(): WCSchedulePayload {
  return record as unknown as WCSchedulePayload;
}
