// Watching adapter — turns raw API games + pinned IDs into PinnedItem cards.
// Pure functions only. The hook does the I/O.

import type { StatusTone } from "../atoms/StatusPill";
import type { PinnedGame } from "../state/types";
import type { NBAGame, WCGameLite } from "../today/today-data";

export type PinnedSource = "nba" | "wc";

export type PinnedItem = {
  source: PinnedSource;
  id: string;
  pinnedAt: number;

  // Display
  matchup: string;             // "NYK · CLE"
  contextEyebrow: string;      // "NBA · Game 4" | "Summer Soccer · Group A"
  status: "live" | "upcoming" | "final";
  statusLabel: string;         // "LIVE" | "TONIGHT" | "FINAL"
  statusTone: StatusTone;
  scoreLine: string | null;    // "75 – 87" — null for upcoming
  detailLine: string;          // "Q3 · 0:09" | "8:00 PM · MSG" | "Final"

  awayCode: string;
  homeCode: string;
  awayName: string;
  homeName: string;

  watch?: { channel: string; stream?: string };

  // Spoiler primitive metadata
  spoilerSubject: string;      // "Knicks vs Cavaliers"
  spoilerKind: "live" | "final" | "series";

  href: string;                // "/game/{id}"
};

export type StalePin = {
  source: PinnedSource;        // best guess, defaults to "nba"
  id: string;
  pinnedAt: number;
};

export type WatchingPayload = {
  items: PinnedItem[];
  /** Pins whose game we couldn't find in either feed. Kept for unpin. */
  stalePins: StalePin[];
  /** Number of pinned games currently live. Live Room renders when ≥2. */
  liveCount: number;
  /** The single closest live game by score margin — the "switch to one-
   *  possession game" suggestion when the Live Room is on. Null when no
   *  live pin or when more than one game is equally close. NBA-only for
   *  now; WC games are tagged but we don't compute "closest" for them
   *  in this stage. */
  closestLive: { id: string; margin: number } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────

function statusToToneAndLabel(
  status: "live" | "upcoming" | "final"
): { tone: StatusTone; label: string } {
  switch (status) {
    case "live":
      return { tone: "live", label: "LIVE" };
    case "upcoming":
      return { tone: "upcoming", label: "UPCOMING" };
    case "final":
      return { tone: "final", label: "FINAL" };
  }
}

function formatGameTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// `sport` picks the same-day word: NBA games skew evening ("Tonight"),
// Summer Soccer is daytime in the US ("Today"). Mirrors the same fix in
// today-data.ts so a same-day soccer pin doesn't read "Tonight" here
// while Today says "Today".
function formatGameDay(
  date: string,
  now = new Date(),
  sport: "nba" | "wc" = "nba"
): string {
  const d = new Date(date);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return sport === "wc" ? "Today" : "Tonight";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

// ── Per-source builders ───────────────────────────────────────────────

export function nbaToPinned(g: NBAGame, pinnedAt: number): PinnedItem {
  const { tone, label } = statusToToneAndLabel(g.status);
  const isFinal = g.status === "final";
  const isUpcoming = g.status === "upcoming";

  let detailLine = g.statusText || "";
  if (isUpcoming) {
    detailLine = `${formatGameDay(g.date)} · ${formatGameTime(g.date)}`;
  } else if (isFinal && g.seriesSummary) {
    detailLine = g.seriesSummary;
  }

  const isSeriesClinch = /WINS\s+SERIES/i.test(g.seriesSummary);

  return {
    source: "nba",
    id: g.id,
    pinnedAt,
    matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
    contextEyebrow: g.gameContext ? `NBA · ${g.gameContext}` : "NBA",
    status: g.status,
    // Keep the status pill as a calm identity badge ("LIVE" / "UPCOMING" /
    // "FINAL") — the clock+period lives in detailLine so the two slots
    // answer different questions and don't visually duplicate.
    statusLabel: label,
    statusTone: tone,
    scoreLine: isUpcoming ? null : `${g.away.score} – ${g.home.score}`,
    detailLine,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayName: g.away.name,
    homeName: g.home.name,
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    spoilerSubject: g.matchup || `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    spoilerKind: isSeriesClinch ? "series" : isFinal ? "final" : "live",
    href: `/game/${g.id}`,
  };
}

function wcToPinned(g: WCGameLite, pinnedAt: number): PinnedItem {
  const { tone, label } = statusToToneAndLabel(g.status);
  const isUpcoming = g.status === "upcoming";

  let detailLine = g.statusText || "";
  if (isUpcoming) {
    detailLine = `${formatGameDay(g.date, new Date(), "wc")} · ${formatGameTime(g.date)}`;
    if (g.stage) detailLine += ` · ${g.stage}`;
  }

  return {
    source: "wc",
    id: g.id,
    pinnedAt,
    matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
    contextEyebrow: g.stage ? `Summer Soccer · ${g.stage}` : "Summer Soccer",
    status: g.status,
    statusLabel: label,
    statusTone: tone,
    scoreLine: isUpcoming ? null : `${g.away.score} – ${g.home.score}`,
    detailLine,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayName: g.away.name,
    homeName: g.home.name,
    watch: g.broadcasts[0]
      ? { channel: g.broadcasts[0] }
      : g.watchLabel
        ? { channel: g.watchLabel }
        : undefined,
    spoilerSubject: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    spoilerKind: "live",
    href: `/game/${g.id}`,
  };
}

// ── Public builder ────────────────────────────────────────────────────

export function buildWatchingPayload({
  nba,
  wc,
  pinned,
}: {
  nba: NBAGame[];
  wc: WCGameLite[];
  pinned: PinnedGame[];
}): WatchingPayload {
  const nbaById = new Map(nba.map((g) => [g.id, g]));
  const wcById = new Map(wc.map((g) => [g.id, g]));

  const items: PinnedItem[] = [];
  const stalePins: StalePin[] = [];

  // Newest pins first — feels right for "what am I tracking right now".
  const ordered = [...pinned].sort((a, b) => b.pinnedAt - a.pinnedAt);

  for (const pin of ordered) {
    const nbaGame = nbaById.get(pin.gameId);
    if (nbaGame) {
      items.push(nbaToPinned(nbaGame, pin.pinnedAt));
      continue;
    }
    const wcGame = wcById.get(pin.gameId);
    if (wcGame) {
      items.push(wcToPinned(wcGame, pin.pinnedAt));
      continue;
    }
    stalePins.push({ source: "nba", id: pin.gameId, pinnedAt: pin.pinnedAt });
  }

  // Within items, push live to the top, then upcoming, then final —
  // newest pin order is preserved within each tier.
  const tierRank = (s: PinnedItem["status"]) =>
    s === "live" ? 0 : s === "upcoming" ? 1 : 2;
  items.sort((a, b) => tierRank(a.status) - tierRank(b.status));

  // ── Live Room derivations (Stage 15E) ───────────────────────────────
  const liveItems = items.filter((i) => i.status === "live");
  const liveCount = liveItems.length;
  const closestLive = pickClosestLive(liveItems, nbaById);

  return { items, stalePins, liveCount, closestLive };
}

// ── System D copy helpers (D2 Task 5) ─────────────────────────────────

/** Pagehead meta line (System D) — one helper for both widths (D4b). Mono
 *  caps, no trailing period — the broadsheet register wants a stamp, not a
 *  sentence. `live` drives the breathing dot. Spoiler-safe: timing only,
 *  never a winner or a margin. */
export function buildWatchingMeta(
  items: Pick<PinnedItem, "status">[],
  staleCount: number
): { text: string; live: boolean } {
  const live = items.filter((i) => i.status === "live").length;
  const upcoming = items.filter((i) => i.status === "upcoming").length;
  const final = items.filter((i) => i.status === "final").length;

  if (live > 0) {
    return { text: live === 1 ? "1 GAME LIVE" : `${live} GAMES LIVE`, live: true };
  }
  if (items.length === 0) {
    // Nothing resolved — either loading or truly gone. With stale pins,
    // surface the unavailable count; otherwise a calm default.
    if (staleCount > 0) {
      return {
        text:
          staleCount === 1
            ? "1 TRACKED GAME UNAVAILABLE"
            : `${staleCount} TRACKED GAMES UNAVAILABLE`,
        live: false,
      };
    }
    return { text: "ONE GAME TRACKED", live: false };
  }
  if (upcoming > 0 && final === 0) {
    return {
      text: upcoming === 1 ? "1 TRACKED FOR LATER" : `${upcoming} TRACKED FOR LATER`,
      live: false,
    };
  }
  if (final > 0 && upcoming === 0) {
    return { text: final === 1 ? "1 GAME WRAPPED" : "ALL WRAPPED", live: false };
  }
  return { text: `${upcoming} UPCOMING · ${final} WRAPPED`, live: false };
}

/** Parse a "75 – 87" score string into [75, 87]. Tolerant: an en-dash,
 *  hyphen, or em-dash all parse. Returns [null, null] for upcoming pins (no
 *  score yet) or unexpected shapes. One export shared by the Live Room ink
 *  rows and the tracked agate rows so the two never drift. */
export function parseScoreLine(
  line: string | null
): [number | null, number | null] {
  if (!line) return [null, null];
  const m = line.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}

/** Compact right-edge stamp for a tracked (agate / board) row. Upcoming
 *  shows the kickoff time parsed out of the detail line; final shows FT;
 *  live shows the clock/period (already compact). Pure + testable. The
 *  Stamp atom uppercases via CSS, so this returns the raw token. */
export function trackedStampText(
  item: Pick<PinnedItem, "status" | "detailLine">
): string {
  if (item.status === "final") return "FT";
  if (item.status === "upcoming") {
    // detailLine is "Tonight · 8:00 PM" (· stage). Pull the clock time; fall
    // back to a calm "Soon" when the shape doesn't parse.
    const m = item.detailLine.match(/\d{1,2}:\d{2}\s?(?:AM|PM)?/i);
    return m ? m[0].trim() : "Soon";
  }
  return item.detailLine || "LIVE";
}

/** From the live pinned games, find the one with the tightest score
 *  margin. Returns null when nothing qualifies (no live, or a tie). The
 *  "tie" case intentionally returns null — we don't surface a chip when
 *  there's no single answer.
 *
 *  WC games are tagged with `source: "wc"` but we don't compute
 *  "closest" for them today; the soccer score-margin question is shaped
 *  differently (a 1-goal lead is not the same as a 3-point NBA lead).
 *  Keep this NBA-only until the WC live feed proves out. */
function pickClosestLive(
  liveItems: PinnedItem[],
  nbaById: Map<string, NBAGame>
): { id: string; margin: number } | null {
  const candidates: Array<{ id: string; margin: number }> = [];
  for (const item of liveItems) {
    if (item.source !== "nba") continue;
    const g = nbaById.get(item.id);
    if (!g) continue;
    const margin = Math.abs(g.away.score - g.home.score);
    candidates.push({ id: item.id, margin });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.margin - b.margin);
  // If the top two are tied on margin, no single "switch" suggestion.
  if (candidates.length > 1 && candidates[0].margin === candidates[1].margin) {
    return null;
  }
  return candidates[0];
}
