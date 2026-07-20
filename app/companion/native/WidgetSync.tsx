"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFollows, usePinned, useNoSpoilers } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { isCapacitorNative } from "../dev/native-detect";
import {
  buildTodayPayload,
  daysUntil,
  WC_KICKOFF,
  type NBAGame,
  type WCGameLite,
  type UpNextItem,
} from "../today/today-data";
import { getTournament } from "../following/data/tournaments";
import {
  writeWidgetSnapshot,
  type WidgetSnapshot,
  type WidgetUpcoming,
  type WidgetLive,
} from "./widget-bridge";
import type { Follow } from "../state/types";
import {
  buildNBAFollowCoverage,
  nbaGameMatchesFollowCoverage,
} from "../following/nba-follow-coverage";
import { followHidesParticipants } from "../spoiler/follow-match";
import {
  selectiveHiddenFollowKey,
  shouldResetRevealLevels,
  type RevealPrivacyState,
} from "../spoiler/reveal-reset";

// WidgetSync — invisible, mounted globally beside LiveActivitySync. The
// web half of the home-screen widget (Phase 22.5-4).
//
// Job: keep the native widget's App Group snapshot in step with the
// user's upcoming followed games + the moment line. It reuses the exact
// Today payload builder, so the widget shows the same "Upcoming" +
// "Reminder" the Today screen does.
//
// Native-only: the poll is disabled off-native, and writeWidgetSnapshot
// is a guaranteed no-op on web / desktop. Safe to ship before the Swift
// plugin + App Group exist — it just does nothing until a build that
// includes them runs.

const REFRESH_MS = 30 * 60 * 1000; // upcoming/moments don't change fast
// While a followed game is live, refresh fast so the widget's live score (and
// the live→final flip) stays current with the app open — the 30-min idle
// cadence left "Live" stale on the tile after a game had already ended.
const LIVE_REFRESH_MS = 15 * 1000;

const ACCENT_NBA = "#e55b2a";
const ACCENT_WC = "#1e6b3c";
const ACCENT_NFL = "#1f3a6b";

// Return null on FAILURE (network/HTTP error) vs [] on a genuine empty
// feed. The caller uses null to decide whether to skip the snapshot
// write entirely — a transient fetch failure must NOT overwrite a
// previously-good widget snapshot with an empty one (which would blank
// the user's widget on a momentary network blip).
async function fetchNBA(): Promise<{
  games: NBAGame[];
  recent: NBAGame[];
} | null> {
  try {
    const res = await fetch("/api/live-scores", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      games?: NBAGame[];
      seriesGames?: NBAGame[];
    };
    const games = json.games ?? [];
    // seriesGames is the wider window (~2 weeks each way) — Up Next needs
    // it so next week's playoff games are included before the WC openers.
    return { games, recent: json.seriesGames ?? games };
  } catch {
    return null;
  }
}

async function fetchWC(): Promise<WCGameLite[] | null> {
  try {
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return null;
  }
}

// Widget live-status label. Drops the ticking minute / clock ("58'",
// "Q3 4:21") to a plain "Live" — home-screen + lock-screen widgets can't
// refresh per-minute, so a precise clock always lags (and visibly trails
// the real-time Live Activity beside it). Word statuses that don't tick
// (HT, Delayed, Penalties) are kept; only digit-bearing clocks collapse.
function widgetLiveStatus(statusText: string): string {
  if (!statusText) return "Live";
  return /\d/.test(statusText) ? "Live" : statusText;
}

const ACCENT_BY_SPORT: Record<WidgetUpcoming["sport"], string> = {
  nba: ACCENT_NBA,
  wc: ACCENT_WC,
  nfl: ACCENT_NFL,
};

function itemToUpcoming(item: UpNextItem): WidgetUpcoming {
  // TodaySource and the widget sport union are the same values now (Phase
  // 22) — pass the source straight through instead of collapsing to nba/wc.
  const sport: WidgetUpcoming["sport"] = item.source;
  return {
    id: item.id,
    sport,
    eyebrow: item.eyebrow,
    matchup: item.headline,
    detail: item.detail,
    broadcast: item.watch?.channel,
    accentHex: ACCENT_BY_SPORT[sport],
    // Widgets are system entry points, not Today links. Keep the canonical
    // game URL source-free so a cold tap uses game detail's safe Today
    // fallback instead of claiming an in-app surface opened it.
    href: `/game/${item.id}`,
  };
}

// Live followed games for the live-score widget. A game counts as followed
// for a direct team/country, an exact two-team series matchup, or a matching
// tournament. Score is redacted when global No-Spoilers is on, or when a
// matching follow has per-follow hideSpoilers.
export function buildLiveEntries(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  noSpoilers: boolean
): WidgetLive[] {
  const nbaFollowCoverage = buildNBAFollowCoverage(follows);
  const wcCodes = new Set<string>();
  let wcTour = false;
  let nbaTour = false;
  for (const f of follows) {
    if (f.kind === "country") wcCodes.add(f.id.toUpperCase());
    else if (f.kind === "tournament") {
      const accent = getTournament(f.id)?.accent;
      if (accent === "var(--wc)") wcTour = true;
      if (accent === "var(--nba)") nbaTour = true;
    }
  }

  const hideFor = (away: string, home: string, sport: "nba" | "wc" | "nfl"): boolean => {
    if (noSpoilers) return true;
    return followHidesParticipants(
      follows,
      // WC matches on country codes; NBA + NFL both match on team codes.
      sport === "wc"
        ? { countryCodes: [away, home], sport }
        : { teamCodes: [away, home], sport }
    );
  };

  const out: WidgetLive[] = [];
  for (const g of nba) {
    if (g.status !== "live") continue;
    const a = g.away.abbreviation.toUpperCase();
    const h = g.home.abbreviation.toUpperCase();
    if (!(nbaTour || nbaGameMatchesFollowCoverage(nbaFollowCoverage, a, h))) {
      continue;
    }
    out.push({
      id: g.id,
      sport: "nba",
      away: { code: g.away.abbreviation, score: g.away.score },
      home: { code: g.home.abbreviation, score: g.home.score },
      statusLine: widgetLiveStatus(g.statusText),
      redacted: hideFor(a, h, "nba"),
      accentHex: ACCENT_NBA,
      href: `/game/${g.id}`,
    });
  }
  for (const g of wc) {
    if (g.status !== "live") continue;
    const a = g.away.abbreviation.toUpperCase();
    const h = g.home.abbreviation.toUpperCase();
    if (!(wcTour || wcCodes.has(a) || wcCodes.has(h))) continue;
    out.push({
      id: g.id,
      sport: "wc",
      away: { code: g.away.abbreviation, score: g.away.score },
      home: { code: g.home.abbreviation, score: g.home.score },
      statusLine: widgetLiveStatus(g.statusText),
      redacted: hideFor(a, h, "wc"),
      accentHex: ACCENT_WC,
      href: `/game/${g.id}`,
    });
  }
  return out.slice(0, 5);
}

export function WidgetSync() {
  const { follows } = useFollows();
  const { pinned, hydrated } = usePinned();
  const noSpoilers = useNoSpoilers();

  // Stable refs the poll closure reads without re-subscribing.
  const followsRef = useRef(follows);
  const pinnedRef = useRef(pinned);
  const noSpoilersRef = useRef(noSpoilers);
  const lastSnapshotRef = useRef<WidgetSnapshot | null>(null);
  const privacyStateRef = useRef<RevealPrivacyState>({
    globalNoSpoilers: false,
    selectiveHiddenFollowKey: "",
  });
  // Drives the poll cadence: tightens to LIVE_REFRESH_MS while a followed
  // game is live, relaxes to REFRESH_MS otherwise.
  const hasLiveRef = useRef(false);
  useEffect(() => {
    followsRef.current = follows;
  }, [follows]);
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);
  useEffect(() => {
    noSpoilersRef.current = noSpoilers;
  }, [noSpoilers]);

  const writePrivacySafeSnapshot = useCallback(async () => {
    const previous = lastSnapshotRef.current;
    const safeSnapshot: WidgetSnapshot = {
      generatedAt: Date.now(),
      upcoming: previous?.upcoming ?? [],
      live: [],
      moment: previous?.moment ?? null,
      empty:
        (previous?.upcoming.length ?? 0) === 0 && previous?.moment == null,
    };
    hasLiveRef.current = false;
    lastSnapshotRef.current = safeSnapshot;
    await writeWidgetSnapshot(safeSnapshot);
  }, []);

  const writeSnapshot = useCallback(async () => {
    const [nbaRes, wcRes] = await Promise.all([fetchNBA(), fetchWC()]);

    // If BOTH feeds failed (network blip / both endpoints down), skip the
    // write entirely rather than overwriting a good snapshot with empty
    // data. A blanked widget on a transient failure reads as broken.
    // When at least one feed succeeded, proceed (treat the failed one as
    // an empty list — partial data beats stale-everything).
    if (nbaRes === null && wcRes === null) {
      const privacyActive =
        noSpoilersRef.current ||
        followsRef.current.some((follow) => follow.hideSpoilers);
      if (privacyActive) {
        await writePrivacySafeSnapshot();
      }
      return;
    }
    const nba = nbaRes?.games ?? [];
    const nbaRecent = nbaRes?.recent ?? [];
    const wc = wcRes ?? [];

    const payload = buildTodayPayload({
      nba,
      nbaRecent,
      wc,
      follows: followsRef.current,
      pinned: pinnedRef.current,
    });

    // Widget respects follows strictly: only personal games (followed
    // team / country / series / tournament) reach the home-screen tile.
    // When the user has nothing personal, the widget falls back to the
    // moment line (or its empty CTA). Cap at 5 so the medium widget can
    // page through a couple more games before wrapping.
    const upcoming = payload.upNext
      // No imminent games on the tile: an already-started game showing its
      // passed kickoff time is exactly the stale-widget read this filter
      // family exists to prevent. The Live Activity owns started games.
      .filter((item) => item.personal && !item.imminent)
      .slice(0, 5)
      .map(itemToUpcoming);
    let moment: WidgetSnapshot["moment"] = payload.reminder
      ? { text: payload.reminder.text, detail: payload.reminder.detail }
      : null;

    // Anticipation fallback: the user follows something, but nothing is
    // scheduled in the feed window yet (e.g. they follow the Summer Soccer a
    // week before kickoff). Instead of a blank widget with a "follow
    // something" CTA — which is wrong, they already did — show a calm
    // countdown. Today that's the Summer Soccer pre-kickoff; a WC tournament
    // or country follow qualifies.
    if (upcoming.length === 0 && !moment) {
      const followsWc = followsRef.current.some(
        (f) =>
          (f.kind === "tournament" &&
            getTournament(f.id)?.accent === "var(--wc)") ||
          f.kind === "country"
      );
      if (followsWc) {
        const days = daysUntil(WC_KICKOFF);
        if (days > 0) {
          moment = {
            text: "Summer Soccer 2026",
            detail:
              days === 1 ? "Kicks off tomorrow" : `Kicks off in ${days} days`,
          };
        }
      }
    }

    const live = buildLiveEntries(
      nba,
      wc,
      followsRef.current,
      noSpoilersRef.current
    );
    hasLiveRef.current = live.length > 0;

    const snapshot: WidgetSnapshot = {
      generatedAt: Date.now(),
      upcoming,
      live,
      moment,
      empty: upcoming.length === 0 && live.length === 0 && moment === null,
    };
    lastSnapshotRef.current = snapshot;
    await writeWidgetSnapshot(snapshot);
  }, [writePrivacySafeSnapshot]);

  // Recompute + write whenever follows, pins, or global No-Spoilers changes
  // (cheap, native-only). Waiting for the 30-minute idle poll after a privacy
  // toggle could leave a score visible on the home screen.
  // DEBOUNCED: hydration races + chained state updates can fire follows/pinned
  // many times in quick succession at boot — without this, each one triggers
  // a fetchNBA + fetchWC + WidgetCenter.reloadAllTimelines round-trip and the
  // app feels stuck. 400ms coalesces the burst into a single write.
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isCapacitorNative() || !hydrated) return;
    const nextPrivacy: RevealPrivacyState = {
      globalNoSpoilers: noSpoilers,
      selectiveHiddenFollowKey: selectiveHiddenFollowKey(follows),
    };
    const privacyTightened = shouldResetRevealLevels(
      privacyStateRef.current,
      nextPrivacy
    );
    privacyStateRef.current = nextPrivacy;

    // Privacy writes are network-independent and start immediately. A slow
    // or hung feed request can never extend the life of a visible score.
    const privacyWrite = privacyTightened
      ? writePrivacySafeSnapshot()
      : Promise.resolve();
    if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
    writeTimeoutRef.current = setTimeout(() => {
      writeTimeoutRef.current = null;
      void privacyWrite.then(writeSnapshot);
    }, 400);
    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
    };
  }, [
    follows,
    pinned,
    noSpoilers,
    hydrated,
    writeSnapshot,
    writePrivacySafeSnapshot,
  ]);

  // Slow refresh while the app is open so day-rollover / new fixtures
  // land in the widget. Disabled off-native.
  useVisibilityPoll(
    async () => {
      await writeSnapshot();
    },
    () => (hasLiveRef.current ? LIVE_REFRESH_MS : REFRESH_MS),
    isCapacitorNative() && hydrated
  );

  return null;
}
