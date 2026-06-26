"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { readFeed, FEED_KEYS } from "../hooks/feed-cache";
import type { NBAGame, WCGameLite } from "../today/today-data";
import type { Game } from "../../nba/types";
import { NBALiveCompanion } from "./NBALiveCompanion";
import { WCGameDetail } from "./WCGameDetail";
import { GameKeyboardNav } from "./GameKeyboardNav";

// /game/[id] router. Resolves the game id against NBA + WC feeds in
// parallel, then hands off to the appropriate variant:
//   - NBALiveCompanion (Stage 6 deepening)
//   - WCGameDetail (Stage 5 minimal shell preserved)
// Falls back to a calm NotFound screen if the id doesn't resolve.

type Resolved =
  | { source: "nba"; game: Game; allNBAGames: Game[] }
  | { source: "wc"; game: WCGameLite }
  | { source: null; game: null };

type ApiResponse = {
  games?: NBAGame[];
  seriesGames?: NBAGame[];
};

function mergeNBAGames(
  games: ReadonlyArray<NBAGame>,
  seriesGames: ReadonlyArray<NBAGame>
): NBAGame[] {
  const byId = new Map<string, NBAGame>();
  for (const game of seriesGames) byId.set(game.id, game);
  for (const game of games) byId.set(game.id, game);
  return Array.from(byId.values());
}

async function fetchGames(): Promise<{
  nba: NBAGame[];
  allNBA: NBAGame[];
  wc: WCGameLite[];
}> {
  try {
    // wcFeedUrl() honors ?preview=wc-day so a pinned preview WC match
    // resolves cleanly when its detail page loads — otherwise the
    // dispatcher's preview gameId (e.g. "preview-wc-usa-tur") won't
    // appear in real /api/world-cup data and the page falls through
    // to the "Game snapshot unavailable" NotFound.
    const [nbaRes, wcRes] = await Promise.all([
      fetch("/api/live-scores", { cache: "no-store" }),
      fetch(wcFeedUrl(), { cache: "no-store" }),
    ]);
    const nbaJson = nbaRes.ok ? ((await nbaRes.json()) as ApiResponse) : {};
    const nba = nbaJson.games ?? [];
    const allNBA = mergeNBAGames(nba, nbaJson.seriesGames ?? []);
    const wcJson = wcRes.ok
      ? ((await wcRes.json()) as { games?: WCGameLite[] })
      : { games: [] };
    return { nba, allNBA, wc: wcJson.games ?? [] };
  } catch {
    return { nba: [], allNBA: [], wc: [] };
  }
}

// Seed the initial resolve from the shared feed cache (the same slate Today /
// Watching just wrote), so tapping a game you were already looking at paints
// instantly instead of flashing a resolving state. The poll refreshes within
// its interval; a cache miss falls back to the fetch path as before.
function seedResolved(gameId: string): Resolved | null {
  try {
    const ls = readFeed<{ games: NBAGame[]; recent: NBAGame[] }>(
      FEED_KEYS.liveScores
    );
    if (ls) {
      const allNBA = mergeNBAGames(ls.games ?? [], ls.recent ?? []);
      const nbaGame = allNBA.find((g) => g.id === gameId);
      if (nbaGame) {
        return {
          source: "nba",
          game: nbaGame as unknown as Game,
          allNBAGames: allNBA as unknown as Game[],
        };
      }
    }
    const wc = readFeed<WCGameLite[]>(FEED_KEYS.worldCup);
    const wcGame = wc?.find((g) => g.id === gameId);
    if (wcGame) return { source: "wc", game: wcGame };
  } catch {
    /* cache unavailable — resolve via fetch */
  }
  return null;
}

// Polling cadence matches the rest of the app (10s live / 30s idle).
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function GameDetailClient({ gameId }: { gameId: string }) {
  const { isPinned, pinGame, unpinGame } = usePinned();
  const [resolved, setResolved] = useState<Resolved | null>(() =>
    seedResolved(gameId)
  );
  const resolvedRef = useRef<Resolved | null>(resolved);

  useEffect(() => {
    const mounted = { current: true };

    async function resolve() {
      const { nba, allNBA, wc } = await fetchGames();
      if (!mounted.current) return;

      const nbaGame = nba.find((g) => g.id === gameId) ?? allNBA.find((g) => g.id === gameId);
      if (nbaGame) {
        // The /api/live-scores `NBAGame` is structurally a subset of the
        // nba/types `Game` — every field the Live Companion needs (away,
        // home, status, statusText, period, matchup, gameContext,
        // seriesSummary, seriesConference, seriesRound, broadcasts) is
        // present. Cast through unknown to make the boundary explicit.
        //
        // We also pass the full NBA games list down so deriveSeriesDots
        // can populate winner abbreviations for past games in the strip
        // (otherwise only the current game's dot shows the winner).
        const next = {
          source: "nba",
          game: nbaGame as unknown as Game,
          allNBAGames: allNBA as unknown as Game[],
        } as const;
        resolvedRef.current = next;
        setResolved(next);
        return;
      }
      const wcGame = wc.find((g) => g.id === gameId);
      if (wcGame) {
        const next = { source: "wc", game: wcGame } as const;
        resolvedRef.current = next;
        setResolved(next);
        return;
      }

      // Live feed didn't have this game. Try the persisted final
      // snapshot before giving up — finals drop off /api/live-scores
      // a few hours after the game ends but live on in KV for ~60 days.
      try {
        const snapRes = await fetch(`/api/game-snapshot/${encodeURIComponent(gameId)}`, {
          cache: "no-store",
        });
        if (snapRes.ok) {
          const snapJson = (await snapRes.json()) as {
            ok: boolean;
            found: boolean;
            game?: Game;
          };
          if (snapJson.found && snapJson.game) {
            const next = {
              source: "nba",
              game: snapJson.game,
              allNBAGames: allNBA as unknown as Game[],
            } as const;
            resolvedRef.current = next;
            setResolved(next);
            return;
          }
        }
      } catch {
        /* snapshot fetch failed — fall through to NotFound */
      }

      // Nothing resolved this tick. If we already had a resolved game, KEEP it
      // — a transient empty/failed feed (a 503, a dropped poll) must not blank
      // a live scoreboard to "snapshot unavailable". Only fall to NotFound when
      // we never resolved anything (a genuinely bad id).
      if (resolvedRef.current && resolvedRef.current.source !== null) {
        return;
      }
      const next = { source: null, game: null } as const;
      resolvedRef.current = next;
      setResolved(next);
    }

    if (pageIsVisible()) resolve();

    // Re-resolve on a beat so a game that just appeared in the feed shows
    // up without a manual refresh. We don't have status here yet, so use
    // the conservative idle cadence; the variant's own hook escalates to
    // live cadence once it lands.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timeout);
      const current = resolvedRef.current;
      const live =
        current !== null &&
        current.source !== null &&
        current.game !== null &&
        "status" in current.game &&
        current.game.status === "live";
      timeout = setTimeout(async () => {
        if (pageIsVisible()) await resolve();
        schedule();
      }, live ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS);
    }
    schedule();

    function handleVisibilityChange() {
      if (pageIsVisible()) {
        resolve();
        schedule();
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [gameId]);

  const pinned = isPinned(gameId);
  const onPin = () => pinGame(gameId);
  const onUnpin = () => unpinGame(gameId);

  if (resolved === null) return <LoadingShell />;

  if (resolved.source === "nba") {
    return (
      <>
        <GameKeyboardNav gameId={gameId} />
        <NBALiveCompanion
          game={resolved.game}
          allNBAGames={resolved.allNBAGames}
          pinned={pinned}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      </>
    );
  }

  if (resolved.source === "wc") {
    return (
      <>
        <GameKeyboardNav gameId={gameId} />
        <WCGameDetail
          game={resolved.game}
          pinned={pinned}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      </>
    );
  }

  return <NotFound gameId={gameId} pinned={pinned} onUnpin={onUnpin} />;
}

// ── Fallback shells ─────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <main
      className="mx-auto max-w-md px-4 pb-4 pt-1"
      aria-busy
      aria-live="polite"
    >
      <div
        className="h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="mt-2 h-[44px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <span className="sr-only">Loading game</span>
    </main>
  );
}

function NotFound({
  gameId,
  pinned,
  onUnpin,
}: {
  gameId: string;
  pinned: boolean;
  onUnpin: () => void;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Eyebrow>Game</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Game snapshot unavailable.
      </Display>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        This game isn&apos;t in the current scoreboard, and we don&apos;t have a saved snapshot for it.
      </p>

      {/* Raw ID only shown in dev. Production users never see internals. */}
      {isDev ? (
        <p
          className="mt-3 text-[11px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--mute-2)",
            letterSpacing: "0.06em",
          }}
        >
          ID · {gameId}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        {pinned ? (
          <button
            type="button"
            onClick={onUnpin}
            aria-label="Unpin"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unpin
          </button>
        ) : (
          <Link
            href="/following"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Back to Following
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Open Today
        </Link>
      </div>
    </main>
  );
}
