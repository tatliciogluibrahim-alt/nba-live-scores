"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNoSpoilers, useFollows } from "../providers";

// Per-game reveal state for No-Spoilers mode.
//
// The problem this solves: every spoiler-able piece used to own its own
// reveal state (the score, the per-quarter line, each highlight, the
// recap, the series strip). On a single game that meant a dozen separate
// "tap to reveal" buttons — opening one game under No-Spoilers felt like
// clicking everything in sight to see the full picture.
//
// Instead we track reveal at the GAME level. One reveal(gameId) flips the
// whole game to revealed; every component keyed to that id renders its
// plain (spoiler-off) state at once. Reveal is session-scoped — held in
// memory, not persisted — so closing/reopening the app re-hides results.
// That matches the calm promise: you opt back into spoilers each session.

type RevealCtx = {
  isRevealed: (gameId: string) => boolean;
  reveal: (gameId: string) => void;
};

const RevealContext = createContext<RevealCtx | null>(null);

export function RevealProvider({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const reveal = useCallback((gameId: string) => {
    if (!gameId) return;
    setRevealed((prev) => {
      if (prev.has(gameId)) return prev;
      const next = new Set(prev);
      next.add(gameId);
      return next;
    });
  }, []);

  const isRevealed = useCallback(
    (gameId: string) => revealed.has(gameId),
    [revealed]
  );

  const value = useMemo<RevealCtx>(
    () => ({ isRevealed, reveal }),
    [isRevealed, reveal]
  );

  return (
    <RevealContext.Provider value={value}>{children}</RevealContext.Provider>
  );
}

/** Reveal controls. Tolerant of being called outside the provider (e.g.
 *  an isolated component render) — returns a never-revealed, no-op shape
 *  so consumers don't need to null-check. */
export function useReveal(): RevealCtx {
  const ctx = useContext(RevealContext);
  if (ctx) return ctx;
  return { isRevealed: () => false, reveal: () => {} };
}

// ── Per-game spoiler scope ────────────────────────────────────────────
// A surface that knows a game's participants (the detail page, a pinned
// card) computes "is this game hidden" ONCE — the global toggle OR a
// participant being a hide-spoilers follow — and wraps its subtree in a
// scope. Every useEffectiveNoSpoilers inside then reads that decision, so
// per-follow selective hiding works without re-threading leaf components.

type SpoilerScope = { gameId: string; hidden: boolean };
const SpoilerScopeContext = createContext<SpoilerScope | null>(null);

export function GameSpoilerScope({
  gameId,
  hidden,
  children,
}: {
  gameId: string;
  /** Pre-reveal hidden state for this game (global toggle OR follow match). */
  hidden: boolean;
  children: ReactNode;
}) {
  const value = useMemo<SpoilerScope>(
    () => ({ gameId, hidden }),
    [gameId, hidden]
  );
  return (
    <SpoilerScopeContext.Provider value={value}>
      {children}
    </SpoilerScopeContext.Provider>
  );
}

/** Effective No-Spoilers for a specific game. Inside a GameSpoilerScope
 *  the scope's pre-reveal `hidden` decision wins (this is what makes
 *  per-follow selective hiding work); otherwise it's the global toggle.
 *  Either way a session reveal of the game clears it. Pass no gameId to
 *  get the plain global value (back-compat for non-game surfaces). */
export function useEffectiveNoSpoilers(gameId?: string): boolean {
  const noSpoilers = useNoSpoilers();
  const { isRevealed } = useReveal();
  const scope = useContext(SpoilerScopeContext);

  const inScope = scope && (!gameId || scope.gameId === gameId);
  const hidden = inScope ? scope.hidden : noSpoilers;
  const effectiveId = gameId ?? scope?.gameId;

  if (!hidden) return false;
  if (effectiveId && isRevealed(effectiveId)) return false;
  return true;
}

/** Does any hide-spoilers follow cover this game? Drives the premium
 *  "selective" behavior: a team / country / series follow with
 *  hideSpoilers hides every game it's part of, even when the global
 *  toggle is off. Tournament follows are intentionally NOT matched here
 *  (too broad — that's what the global toggle is for). */
export function useFollowHidesGame(participants: {
  teamCodes?: string[];
  countryCodes?: string[];
}): boolean {
  const { follows } = useFollows();
  const teamCodes = participants.teamCodes ?? [];
  const countryCodes = participants.countryCodes ?? [];

  return follows.some((f) => {
    if (!f.hideSpoilers) return false;
    if (f.kind === "team") return teamCodes.includes(f.id);
    if (f.kind === "country") return countryCodes.includes(f.id);
    if (f.kind === "series") {
      const [a, b] = f.id.split("-");
      return (
        (Boolean(a) && teamCodes.includes(a)) ||
        (Boolean(b) && teamCodes.includes(b))
      );
    }
    return false;
  });
}
