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
  contextEyebrow: string;      // "NBA · Game 4" | "World Cup · Group A"
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

function formatGameDay(date: string, now = new Date()): string {
  const d = new Date(date);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Tonight";

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

function nbaToPinned(g: NBAGame, pinnedAt: number): PinnedItem {
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
    detailLine = `${formatGameDay(g.date)} · ${formatGameTime(g.date)}`;
    if (g.stage) detailLine += ` · ${g.stage}`;
  }

  return {
    source: "wc",
    id: g.id,
    pinnedAt,
    matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
    contextEyebrow: g.stage ? `World Cup · ${g.stage}` : "World Cup",
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

  return { items, stalePins };
}
