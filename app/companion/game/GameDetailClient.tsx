"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill } from "../atoms/StatusPill";
import { Spoiler } from "../spoiler/Spoiler";
import { WatchLine } from "../watch/WatchLine";
import { usePinned } from "../providers";
import type { NBAGame, WCGameLite } from "../today/today-data";

// Minimal shell for /game/[id]. Stage 5 deliverable: locate the game by id
// from either API, show matchup + status, expose pin/unpin. Full NBA Live
// Companion (Moments, series context, etc.) lands in Stage 6.

type Resolved =
  | { source: "nba"; game: NBAGame }
  | { source: "wc"; game: WCGameLite }
  | { source: null; game: null };

async function fetchGames(): Promise<{ nba: NBAGame[]; wc: WCGameLite[] }> {
  try {
    const [nbaRes, wcRes] = await Promise.all([
      fetch("/api/live-scores", { cache: "no-store" }),
      fetch("/api/world-cup", { cache: "no-store" }),
    ]);
    const nbaJson = nbaRes.ok ? ((await nbaRes.json()) as { games?: NBAGame[] }) : { games: [] };
    const wcJson = wcRes.ok ? ((await wcRes.json()) as { games?: WCGameLite[] }) : { games: [] };
    return { nba: nbaJson.games ?? [], wc: wcJson.games ?? [] };
  } catch {
    return { nba: [], wc: [] };
  }
}

export function GameDetailClient({ gameId }: { gameId: string }) {
  const { isPinned, pinGame, unpinGame } = usePinned();
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { nba, wc } = await fetchGames();
      if (!mounted) return;
      const nbaGame = nba.find((g) => g.id === gameId);
      if (nbaGame) {
        setResolved({ source: "nba", game: nbaGame });
        return;
      }
      const wcGame = wc.find((g) => g.id === gameId);
      if (wcGame) {
        setResolved({ source: "wc", game: wcGame });
        return;
      }
      setResolved({ source: null, game: null });
    })();
    return () => {
      mounted = false;
    };
  }, [gameId]);

  const pinned = isPinned(gameId);

  if (resolved === null) {
    return <LoadingShell />;
  }

  if (resolved.source === null) {
    return <NotFound gameId={gameId} pinned={pinned} onUnpin={() => unpinGame(gameId)} />;
  }

  return resolved.source === "nba" ? (
    <NBADetail
      game={resolved.game}
      pinned={pinned}
      onPin={() => pinGame(gameId)}
      onUnpin={() => unpinGame(gameId)}
    />
  ) : (
    <WCDetail
      game={resolved.game}
      pinned={pinned}
      onPin={() => pinGame(gameId)}
      onUnpin={() => unpinGame(gameId)}
    />
  );
}

// ── Variants ──────────────────────────────────────────────────────────

function NBADetail({
  game,
  pinned,
  onPin,
  onUnpin,
}: {
  game: NBAGame;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const isUpcoming = game.status === "upcoming";
  const statusTone = game.status === "live" ? "live" : game.status === "upcoming" ? "upcoming" : "final";

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{game.gameContext ? `NBA · ${game.gameContext}` : "NBA"}</Eyebrow>
        <StatusPill tone={statusTone} breathe={statusTone === "live"}>
          {statusTone === "live" && game.statusText
            ? game.statusText.toUpperCase()
            : statusTone.toUpperCase()}
        </StatusPill>
      </div>

      <Display as="h1" size="lg" className="mt-2">
        {game.away.abbreviation} · {game.home.abbreviation}
      </Display>

      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {game.status !== "upcoming" ? (
        <p
          className="mt-3 text-[36px] leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <Spoiler ariaSubject={game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`}>
            {game.away.score} – {game.home.score}
          </Spoiler>
        </p>
      ) : null}

      {game.seriesSummary ? (
        <p
          className="mt-2 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {game.seriesSummary}
        </p>
      ) : null}

      {isUpcoming ? (
        <p
          className="mt-2 text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {new Date(game.date).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}

      {game.broadcasts[0] ? (
        <div className="mt-4">
          <WatchLine
            channel={game.broadcasts[0]}
            ariaSubject={game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`}
          />
        </div>
      ) : null}

      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`}
      />

      <Stage6Note />
    </main>
  );
}

function WCDetail({
  game,
  pinned,
  onPin,
  onUnpin,
}: {
  game: WCGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const isUpcoming = game.status === "upcoming";
  const statusTone = game.status === "live" ? "live" : game.status === "upcoming" ? "upcoming" : "final";

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{game.stage ? `World Cup · ${game.stage}` : "World Cup"}</Eyebrow>
        <StatusPill tone={statusTone} breathe={statusTone === "live"}>
          {statusTone === "live" && game.statusText
            ? game.statusText.toUpperCase()
            : statusTone.toUpperCase()}
        </StatusPill>
      </div>

      <Display as="h1" size="lg" className="mt-2">
        {game.away.abbreviation} · {game.home.abbreviation}
      </Display>

      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {game.status !== "upcoming" ? (
        <p
          className="mt-3 text-[36px] leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <Spoiler ariaSubject={`${game.away.abbreviation} vs ${game.home.abbreviation}`}>
            {game.away.score} – {game.home.score}
          </Spoiler>
        </p>
      ) : null}

      {isUpcoming ? (
        <p
          className="mt-2 text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {new Date(game.date).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}

      {(game.broadcasts[0] || game.watchLabel) ? (
        <div className="mt-4">
          <WatchLine
            channel={game.broadcasts[0] ?? game.watchLabel}
            ariaSubject={`${game.away.abbreviation} vs ${game.home.abbreviation}`}
          />
        </div>
      ) : null}

      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={`${game.away.abbreviation} vs ${game.home.abbreviation}`}
      />

      <Stage6Note />
    </main>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────

function PinControls({
  pinned,
  onPin,
  onUnpin,
  subject,
}: {
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  subject: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-2">
      {pinned ? (
        <button
          type="button"
          onClick={onUnpin}
          aria-label={`Unpin ${subject}`}
          aria-pressed
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          ✓ Pinned
        </button>
      ) : (
        <button
          type="button"
          onClick={onPin}
          aria-label={`Pin ${subject} to Watching`}
          aria-pressed={false}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Pin to Watching
        </button>
      )}
      <Link
        href="/watching"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
        aria-label="Open Watching"
      >
        Watching
      </Link>
    </div>
  );
}

function LoadingShell() {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1" aria-busy aria-live="polite">
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
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Eyebrow>Game</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Not in the live feed.
      </Display>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        This game isn&apos;t in the current scoreboard. Try Today or Watching.
      </p>
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
        ) : null}
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

function Stage6Note() {
  return (
    <p
      className="mt-5 text-[11px]"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--mute-2)",
        letterSpacing: "0.06em",
      }}
    >
      Build status · Stage 5 shell · Live Companion (moments) lands in Stage 6.
    </p>
  );
}
