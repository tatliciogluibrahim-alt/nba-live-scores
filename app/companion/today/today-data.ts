// Today data layer — pure adapters. Input: the existing API responses we
// already ship. Output: a single TodayPayload tuned for the Today composition.
// Keep all "what to surface" logic here so the screen file stays a layout.

import type { Follow, PinnedGame } from "../state/types";

// ── Minimal shapes lifted from /api/live-scores + /api/world-cup ─────
// We intentionally keep these decoupled from the legacy route types so
// the adapters can evolve without touching the monoliths.

export type NBAGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  period: number;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  home: { name: string; abbreviation: string; score: number; logo: string };
  away: { name: string; abbreviation: string; score: number; logo: string };
  broadcasts: string[];
};

export type WCGameLite = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
  broadcasts: string[];
  watchLabel: string;
};

// ── Today payload shape ───────────────────────────────────────────────

export type TodayHeroKind = "nba-live" | "nba-upcoming" | "wc-countdown" | null;

export type TodayHero = {
  kind: NonNullable<TodayHeroKind>;
  eyebrow: string;
  headline: string;
  context?: string;
  live: boolean;
  accent: "var(--nba)" | "var(--wc)";
  /** True when this hero is being surfaced because the user pinned the game. */
  pinned?: boolean;
  /** Where tapping the hero goes (Stage 1 placeholder routes for now). */
  href: string;
  /** When set, the No-Spoilers variant uses this matchup string. */
  spoilerMatchup?: string;
  spoilerKind?: "live" | "final" | "series";
  spoilerSubject?: string;
  watch?: { channel: string; stream?: string };
};

export type YouFollowItem = {
  kind: Follow["kind"];
  id: string;
  label: string;
  statusLabel: string;       // "Live" | "Tonight" | "Sat" | "Out" | "Quiet"
  tone: "live" | "upcoming" | "final" | "current";
  href: string;
};

/** Tag every Today item with the source league so consumers can branch
 *  without sniffing optional fields like `stage`. */
export type TodaySource = "nba" | "wc";

export type UpNextItem = {
  source: TodaySource;
  id: string;
  /** True when this game is in the user's pinned list. */
  pinned: boolean;
  eyebrow: string;           // "NBA · Tonight" | "World Cup · Sat"
  headline: string;          // "Knicks vs Cavaliers"
  detail: string;            // "8:00 PM · MSG"
  watch?: { channel: string; stream?: string };
  href: string;
  spoilerSubject: string;
};

export type QuietWrapItem = {
  source: TodaySource;
  id: string;
  eyebrow: string;           // "Yesterday"
  matchup: string;           // "Thunder · Spurs"
  scoreLine: string;         // "121 – 109"
  context?: string;          // "Thunder beat Spurs"
  spoilerSubject: string;
  kind: "final" | "series";
  href: string;
};

export type ReminderRow = {
  text: string;              // "World Cup kicks off in 20 days."
  detail?: string;           // "Mexico City · Group A"
  href?: string;
};

export type TodayPayload = {
  hero: TodayHero | null;
  youFollow: YouFollowItem[];
  upNext: UpNextItem[];
  quietWrap: QuietWrapItem[];
  reminder: ReminderRow | null;
  /** When true, the parent renders the "Calm is a feature" card at the bottom. */
  isQuietDay: boolean;
};

// ── Pure helpers ──────────────────────────────────────────────────────

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

function daysUntil(target: Date, now = new Date()): number {
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
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

function formatGameTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function gameIncludesTeam(g: NBAGame, abbr: string): boolean {
  return g.away.abbreviation === abbr || g.home.abbreviation === abbr;
}

function gameIncludesCountry(g: WCGameLite, code: string): boolean {
  return g.away.abbreviation === code || g.home.abbreviation === code;
}

// ── Hero pick ─────────────────────────────────────────────────────────
// One earned moment. Preference order:
//   1. A live NBA game involving a followed team
//   2. Any live NBA game (closest score in latest period wins)
//   3. The next upcoming NBA game for a followed team
//   4. The WC countdown reminder dressed up as a hero (when no NBA hero exists)

function scoreClosenessRank(g: NBAGame): number {
  // Lower = more interesting. Late-period close games rank lowest.
  if (g.status !== "live") return Number.POSITIVE_INFINITY;
  const diff = Math.abs(g.home.score - g.away.score);
  const period = Math.max(1, g.period);
  // Bigger period = closer to the end = more weight on tight scores.
  return diff * 4 - period * 6;
}

function pickHero(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): TodayHero | null {
  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  const liveGames = nba.filter((g) => g.status === "live");
  const live = [...liveGames].sort(
    (a, b) => scoreClosenessRank(a) - scoreClosenessRank(b)
  );

  // Priority order for the hero spot:
  //   1. A pinned live game — the strongest "I care about this" signal.
  //   2. A followed-team live game.
  //   3. Any live game (closest score first).
  const pinnedLive = live.find((g) => pinnedIds.has(g.id));
  const followedLive = live.find((g) =>
    [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))
  );
  const heroLive = pinnedLive ?? followedLive ?? live[0];

  if (heroLive) {
    const isPinned = pinnedIds.has(heroLive.id);
    const baseEyebrow = heroLive.gameContext || "NBA · Live";
    const watch = heroLive.broadcasts[0]
      ? { channel: heroLive.broadcasts[0] }
      : undefined;
    return {
      kind: "nba-live",
      eyebrow: isPinned ? `Pinned · ${baseEyebrow}` : baseEyebrow,
      headline: deriveLiveHeadline(heroLive),
      context: heroLive.seriesSummary || undefined,
      live: true,
      accent: "var(--nba)",
      pinned: isPinned,
      href: `/game/${heroLive.id}`,
      spoilerMatchup: heroLive.matchup,
      spoilerKind: "live",
      spoilerSubject: heroLive.matchup,
      watch,
    };
  }

  // No live game — try the next upcoming followed-team game today
  const todayNBA = nba.filter((g) => g.status === "upcoming");
  const todayFollowed = todayNBA.find((g) =>
    [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))
  );
  if (todayFollowed) {
    return {
      kind: "nba-upcoming",
      eyebrow: "Next up · NBA",
      headline: `${todayFollowed.away.abbreviation} vs ${todayFollowed.home.abbreviation}`,
      context: `${formatGameDay(todayFollowed.date)} · ${formatGameTime(todayFollowed.date)}`,
      live: false,
      accent: "var(--nba)",
      href: `/game/${todayFollowed.id}`,
      spoilerMatchup: todayFollowed.matchup,
      spoilerKind: "live",
      spoilerSubject: todayFollowed.matchup,
      watch: todayFollowed.broadcasts[0]
        ? { channel: todayFollowed.broadcasts[0] }
        : undefined,
    };
  }

  // Nothing live or imminent on NBA — dress up the WC countdown as the hero
  // if there's actually nothing else worth a hero spot.
  const days = daysUntil(WC_KICKOFF);
  if (days > 0 && days < 60 && nba.length === 0 && wc.length === 0) {
    return {
      kind: "wc-countdown",
      eyebrow: "World Cup 2026",
      headline: `${days} day${days === 1 ? "" : "s"} to first whistle.`,
      context: "Mexico City · Group A · Tournament starts June 11.",
      live: false,
      accent: "var(--wc)",
      href: "/legacy/world-cup",
    };
  }

  return null;
}

function deriveLiveHeadline(g: NBAGame): string {
  // Short, calm, score-free statements. The score lives in body type on the
  // detail screen (Stage 6). Today's hero stays moment-first.
  const diff = Math.abs(g.home.score - g.away.score);
  const inLate = g.period >= 4 || g.statusText.toUpperCase().includes("OT");

  if (inLate && diff <= 3) return "One-possession game.";
  if (inLate && diff <= 6) return "Final minutes are close.";
  if (g.statusText.toUpperCase().includes("HALF")) return "Halftime.";
  if (g.period >= 4) return "Fourth quarter underway.";
  if (g.period === 3) return "Third quarter underway.";
  if (g.period === 2) return "Second quarter underway.";
  return "Game is live.";
}

// ── You follow ────────────────────────────────────────────────────────

function buildYouFollow(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  now = new Date()
): YouFollowItem[] {
  return follows
    .map<YouFollowItem | null>((f) => {
      if (f.kind === "team") {
        const g = nba.find((x) => gameIncludesTeam(x, f.id));
        if (g) {
          return {
            kind: "team",
            id: f.id,
            label: f.id,
            statusLabel:
              g.status === "live"
                ? "Live"
                : g.status === "upcoming"
                  ? formatGameDay(g.date, now)
                  : "Final",
            tone:
              g.status === "live"
                ? "live"
                : g.status === "upcoming"
                  ? "upcoming"
                  : "final",
            href: `/game/${g.id}`,
          };
        }
        return {
          kind: "team",
          id: f.id,
          label: f.id,
          statusLabel: "Quiet",
          tone: "final",
          href: `/series/${f.id}`,
        };
      }
      if (f.kind === "country") {
        const g = wc.find((x) => gameIncludesCountry(x, f.id));
        if (g) {
          return {
            kind: "country",
            id: f.id,
            label: f.id,
            statusLabel:
              g.status === "live"
                ? "Live"
                : g.status === "upcoming"
                  ? formatGameDay(g.date, now)
                  : "Final",
            tone:
              g.status === "live"
                ? "live"
                : g.status === "upcoming"
                  ? "upcoming"
                  : "final",
            href: `/country/${f.id}`,
          };
        }
        const days = daysUntil(WC_KICKOFF, now);
        return {
          kind: "country",
          id: f.id,
          label: f.id,
          statusLabel: days > 0 ? `${days}d` : "Quiet",
          tone: "current",
          href: `/country/${f.id}`,
        };
      }
      if (f.kind === "series") {
        return {
          kind: "series",
          id: f.id,
          label: f.id,
          statusLabel: "Series",
          tone: "current",
          href: `/series/${f.id}`,
        };
      }
      if (f.kind === "tournament") {
        return {
          kind: "tournament",
          id: f.id,
          label: f.id,
          statusLabel: "Cup",
          tone: "current",
          href: "/following",
        };
      }
      return null;
    })
    .filter((x): x is YouFollowItem => x !== null);
}

// ── Up next ───────────────────────────────────────────────────────────

function nbaToUpNext(g: NBAGame, pinned: boolean): UpNextItem {
  return {
    source: "nba",
    id: g.id,
    pinned,
    eyebrow: `NBA · ${formatGameDay(g.date)}`,
    headline: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    detail: `${formatGameTime(g.date)}${g.gameContext ? " · " + g.gameContext : ""}`,
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    href: `/game/${g.id}`,
    spoilerSubject: g.matchup,
  };
}

function wcToUpNext(g: WCGameLite, pinned: boolean): UpNextItem {
  return {
    source: "wc",
    id: g.id,
    pinned,
    eyebrow: `World Cup · ${formatGameDay(g.date)}`,
    headline: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    detail: `${formatGameTime(g.date)}${g.stage ? " · " + g.stage : ""}`,
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    href: `/country/${g.away.abbreviation}`,
    spoilerSubject: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
  };
}

function buildUpNext(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): UpNextItem[] {
  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  const nbaUpcoming = nba
    .filter((g) => g.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const wcUpcoming = wc
    .filter((g) => g.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Personal-first ordering, then everyone else's up-next feed. Items are
  // tagged with `source` and `pinned` at construction so the UI never has
  // to guess.
  const personalNBA = nbaUpcoming
    .filter((g) => [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr)))
    .map((g) => nbaToUpNext(g, pinnedIds.has(g.id)));
  const personalWC = wcUpcoming
    .filter((g) => [...followedCountries].some((code) => gameIncludesCountry(g, code)))
    .map((g) => wcToUpNext(g, pinnedIds.has(g.id)));

  const personalIds = new Set([...personalNBA, ...personalWC].map((i) => i.id));
  const everyoneNBA = nbaUpcoming
    .map((g) => nbaToUpNext(g, pinnedIds.has(g.id)))
    .filter((i) => !personalIds.has(i.id));
  const everyoneWC = wcUpcoming
    .map((g) => wcToUpNext(g, pinnedIds.has(g.id)))
    .filter((i) => !personalIds.has(i.id));

  // Pinned games beat unpinned within the merged list — explicit user
  // intent ranks above follow-derived order. Stable sort preserves the
  // personal-first ordering within each tier.
  const merged = [...personalNBA, ...personalWC, ...everyoneNBA, ...everyoneWC];
  merged.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  return merged.slice(0, 5);
}

// ── Quiet wrap ────────────────────────────────────────────────────────

function buildQuietWrap(
  nba: NBAGame[],
  follows: Follow[]
): QuietWrapItem[] {
  const finals = nba
    .filter((g) => g.status === "final")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );

  // Followed-first ordering.
  const personal = finals.filter((g) =>
    [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))
  );
  const everyone = finals.filter((g) => !personal.includes(g));

  // When the user has no follows, cap at 1 "discovery" row so Quiet Wrap
  // doesn't ESPN-dump three random finals on a fresh user.
  const cap = followedTeams.size === 0 ? 1 : 3;

  return [...personal, ...everyone].slice(0, cap).map<QuietWrapItem>((g) => {
    const matchup = `${g.away.abbreviation} · ${g.home.abbreviation}`;
    const scoreLine = `${g.away.score} – ${g.home.score}`;

    // Pull "Game N" out of the API gameContext when present. Lets two
    // finals of the same series (e.g. NY · CLE Game 3 and NY · CLE Game 4)
    // visually disambiguate in the wrap list.
    const gameNumberMatch = g.gameContext?.match(/Game\s+(\d)/i);
    const gameNumberLabel = gameNumberMatch ? `Game ${gameNumberMatch[1]}` : null;

    const dayLabel =
      formatGameDay(g.date) === "Tonight" ? "Earlier" : "Yesterday";
    const eyebrow = gameNumberLabel
      ? `${dayLabel} · ${gameNumberLabel}`
      : dayLabel;

    // Calm prose only — the score already carries the result. Avoid
    // winner-revealing verbs ("took it", "beat", "won", "advanced",
    // "clinched", "leads") even when No-Spoilers is off. The single
    // word "Final." is the calmest acknowledgement that the game ended.
    const context = "Final.";

    const isSeriesClinch = /WINS\s+SERIES/i.test(g.seriesSummary);

    return {
      source: "nba",
      id: g.id,
      eyebrow,
      matchup,
      scoreLine,
      context,
      spoilerSubject: g.matchup,
      kind: isSeriesClinch ? "series" : "final",
      href: `/game/${g.id}`,
    };
  });
}

// ── Reminder ──────────────────────────────────────────────────────────

function buildReminder(follows: Follow[], now = new Date()): ReminderRow | null {
  const days = daysUntil(WC_KICKOFF, now);
  if (days <= 0 || days > 90) return null;

  const country = follows.find((f) => f.kind === "country");
  if (country) {
    return {
      text: `${country.id} kick off in ${days} day${days === 1 ? "" : "s"}.`,
      detail: "Group draw is set. Match times confirm in June.",
      href: `/country/${country.id}`,
    };
  }

  return {
    text: `World Cup kicks off in ${days} day${days === 1 ? "" : "s"}.`,
    detail: "Pick a country in Following to make this personal.",
    href: "/following",
  };
}

// ── Top-level builder ─────────────────────────────────────────────────

export function buildTodayPayload({
  nba,
  wc,
  follows,
  pinned,
  now = new Date(),
}: {
  nba: NBAGame[];
  wc: WCGameLite[];
  follows: Follow[];
  pinned: PinnedGame[];
  now?: Date;
}): TodayPayload {
  const hero = pickHero(nba, wc, follows, pinned);
  const youFollow = buildYouFollow(nba, wc, follows, now);
  const upNext = buildUpNext(nba, wc, follows, pinned);
  const quietWrap = buildQuietWrap(nba, follows);
  const reminder = buildReminder(follows, now);

  const hasLive = nba.some((g) => g.status === "live") || wc.some((g) => g.status === "live");
  const hasUpcoming = upNext.length > 0;
  const hasFinals = quietWrap.length > 0;
  const isQuietDay = !hasLive && !hasUpcoming && !hasFinals;

  return { hero, youFollow, upNext, quietWrap, reminder, isQuietDay };
}
