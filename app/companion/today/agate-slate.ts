// Pure helpers for the System D mobile agate slate (Task 8). The lead
// Monument is index 01 and the ALSO LIVE band carries 02..0N; the slate
// sections (UP NEXT, QUIET WRAP) continue the SAME running ordinal below the
// band so the whole mobile page reads as one numbered slate (see
// docs/superpowers/design-directions/d-mix). These are string/number pure
// functions only — no React, no data fetching — so the render layer stays a
// layout and the index math + parsing are unit-testable.

import type { TodaySource, ScoreboardTile } from "./today-data";

/** Zero-padded 2-digit ordinal for an agate idx ("04"). Numbers past 99
 *  (never realistic on a single day's slate) fall through un-padded. */
export function padIdx(n: number): string {
  return String(n).padStart(2, "0");
}

/** First running index for the slate below the band. The last index used
 *  above the slate is (lead ? 1 : 0) + bandShownCount, so the slate's first
 *  row is the next one. A quiet day with no lead + no band starts at 01. */
export function slateStartIndex(hasLead: boolean, bandShownCount: number): number {
  return (hasLead ? 1 : 0) + bandShownCount + 1;
}

/** Split a "AWAY vs HOME" matchup/headline into its two codes. Falls back to
 *  the whole string as the away side if there's no " vs " separator. */
export function matchupCodes(s: string): { away: string; home: string } {
  const parts = s.split(/\s+vs\s+/i).map((p) => p.trim());
  return { away: parts[0] ?? s, home: parts[1] ?? "" };
}

/** Parse a "121 – 109" score line (en-dash or hyphen, with or without
 *  spaces) into numbers. Null when the shape doesn't parse. */
export function parseScoreLine(s: string): {
  away: number | null;
  home: number | null;
} {
  const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return { away: null, home: null };
  return { away: Number(m[1]), home: Number(m[2]) };
}

/** En-dash join for an agate score cell ("121–109"), matching d-mix. */
export function agateScore(away: number | null, home: number | null): string {
  return `${away ?? 0}–${home ?? 0}`;
}

/** Sport-correct UP NEXT count noun for the SecHead ("1 MATCH", "2 GAMES").
 *  All-soccer lists read "match(es)"; anything with an NBA/NFL game (or a
 *  mixed slate) reads the generic "game(s)". Returned uppercase — SecHead
 *  renders the count verbatim. */
export function upNextCountLabel(items: { source: TodaySource }[]): string {
  const n = items.length;
  const allWc = n > 0 && items.every((i) => i.source === "wc");
  const noun = allWc ? (n === 1 ? "match" : "matches") : n === 1 ? "game" : "games";
  return `${n} ${noun}`.toUpperCase();
}

/** QUIET WRAP count label — sport-neutral wrapped noun ("2 WRAPPED"). */
export function wrapCountLabel(n: number): string {
  return `${n} WRAPPED`;
}

/** Maximum board rows the ALSO LIVE band renders before the "+N MORE LIVE"
 *  overflow row. Exported so bandShownCount and AlsoLiveBand share one value. */
export const BAND_MAX_ROWS = 5;

/** How many board rows the ALSO LIVE band actually renders for a given slate
 *  — the live-and-not-the-lead games, capped at BAND_MAX_ROWS. Exported so
 *  the mobile agate slate can continue the running index after the band (lead
 *  01, band 02..0N, then the slate) without duplicating the cap logic.
 *  Moved here from AlsoLiveBand.tsx to keep all pure slate helpers testable
 *  in one place (see agate-slate.test.ts). */
export function bandShownCount(
  items: ScoreboardTile[],
  excludeGameId?: string
): number {
  const others = items.filter(
    (t) => t.status === "live" && t.id !== excludeGameId
  );
  return Math.min(others.length, BAND_MAX_ROWS);
}

/** Day-aware kickoff stamp for a listable game on Today. Returns the bare
 *  local time ("9:30 PM") when the fixture falls on the SAME local calendar
 *  day as `now`; otherwise it prefixes the weekday abbrev ("SAT 1:00 PM") so a
 *  later-day game in a mixed UP NEXT list never reads as tonight. Pure — `now`
 *  is injected (render passes new Date(); tests pass a fixed clock). The time
 *  format matches formatGameTime (hour + 2-digit minute) so the stamp stays
 *  visually consistent with the rest of the app. */
export function kickoffStamp(dateIso: string, now: Date): string {
  const d = new Date(dateIso);
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return time;
  const weekday = d
    .toLocaleDateString(undefined, { weekday: "short" })
    .toUpperCase();
  return `${weekday} ${time}`;
}

/** Day-aware kickoff line for the lead Monument's kicker. Same contract as
 *  kickoffStamp, but a same-day fixture reads "TODAY 4:00 PM" instead of a
 *  bare time — the kicker is the ONE place the hero answers "when", so the
 *  day is stated, not implied by the masthead date (beta feedback
 *  2026-07-05: date, time, and context read as three separate locations). */
export function heroKickoffStamp(dateIso: string, now: Date): string {
  const d = new Date(dateIso);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const stamp = kickoffStamp(dateIso, now);
  return sameDay ? `TODAY ${stamp}` : stamp;
}

/** Day-word label for a resting-day UP NEXT row stamp. "Today" when the
 *  fixture is on the current day, otherwise the capitalized dayWord
 *  ("Tomorrow", "Saturday"), falling back to "Upcoming" when neither is
 *  known. On a resting day the games are days out, so the day word carries
 *  more than the kickoff clock — this is what the agate stamp shows. Pure
 *  string logic (no React) so the RestingState render stays a layout. */
export function upNextDayLabel(item: {
  isToday: boolean;
  dayWord?: string;
}): string {
  if (item.isToday) return "Today";
  const w = item.dayWord?.trim();
  if (!w) return "Upcoming";
  return w.charAt(0).toUpperCase() + w.slice(1);
}
