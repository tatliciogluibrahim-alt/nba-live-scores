"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNoSpoilers } from "../providers";

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

/** Effective No-Spoilers for a specific game: the global toggle is on
 *  AND this game hasn't been revealed yet this session. Pass no gameId to
 *  get the plain global value (back-compat for surfaces that aren't keyed
 *  to a single game). */
export function useEffectiveNoSpoilers(gameId?: string): boolean {
  const noSpoilers = useNoSpoilers();
  const { isRevealed } = useReveal();
  if (!noSpoilers) return false;
  if (gameId && isRevealed(gameId)) return false;
  return true;
}
