"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNoSpoilers, useFollows } from "../providers";
import {
  followHidesParticipants,
  type SpoilerParticipants,
} from "./follow-match";
import {
  selectiveHiddenFollowKey,
  shouldResetRevealLevels,
  type RevealPrivacyState,
} from "./reveal-reset";

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

// Sentinel for "fully revealed." A regulation game has 4 quarters (more
// with OT). Any value at or beyond this means "all surfaces show the
// score." revealStep() never reaches it; reveal() jumps to it.
export const FULL_REVEAL = 999;

type RevealCtx = {
  /** True only when the game has been FULLY revealed (the existing
   *  binary contract every score-bearing surface already keys off). */
  isRevealed: (gameId: string) => boolean;
  /** Flip to fully revealed in one step (existing "Tap to reveal"
   *  affordances on Spoiler / NoSpoilerGameCard). */
  reveal: (gameId: string) => void;
  /** Catch-me-up: progressive per-quarter reveal. Each call increments
   *  the level by 1 (Q1 → Q2 → Q3 → Q4). Surfaces that show the final
   *  score keep checking isRevealed (still false during steps); the
   *  catch-me-up component itself calls reveal() at Q4 to flip the
   *  binary and cascade-unblur the rest of the page. */
  revealStep: (gameId: string) => void;
  /** Current reveal level (0 = none, 1..3 = mid-step, FULL_REVEAL =
   *  done). Catch-me-up reads this to decide which quarter rows are
   *  unlocked. Other surfaces don't need it. */
  getRevealLevel: (gameId: string) => number;
};

const RevealContext = createContext<RevealCtx | null>(null);

export function RevealProvider({ children }: { children: ReactNode }) {
  const globalNoSpoilers = useNoSpoilers();
  const { follows } = useFollows();
  const hiddenFollowKey = selectiveHiddenFollowKey(follows);
  const currentPrivacy: RevealPrivacyState = {
    globalNoSpoilers,
    selectiveHiddenFollowKey: hiddenFollowKey,
  };
  const [appliedPrivacy, setAppliedPrivacy] = useState<RevealPrivacyState>(
    () => currentPrivacy
  );
  const resetRequired = shouldResetRevealLevels(
    appliedPrivacy,
    currentPrivacy
  );
  const privacyChanged =
    appliedPrivacy.globalNoSpoilers !== currentPrivacy.globalNoSpoilers ||
    appliedPrivacy.selectiveHiddenFollowKey !==
      currentPrivacy.selectiveHiddenFollowKey;

  // Per-game reveal level. 0 = hidden, 1..3 = catch-me-up in progress,
  // FULL_REVEAL = fully revealed (treated exactly like the old binary).
  const [levels, setLevels] = useState<ReadonlyMap<string, number>>(
    () => new Map()
  );

  // A privacy-setting change must win over an older reveal before the browser
  // can paint. `resetRequired` also makes isRevealed return false during this
  // transition render; the layout effect then drops the stale map and records
  // the new baseline synchronously.
  useLayoutEffect(() => {
    if (!privacyChanged) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppliedPrivacy({
      globalNoSpoilers,
      selectiveHiddenFollowKey: hiddenFollowKey,
    });
    if (!resetRequired) return;
    setLevels((previous) => (previous.size === 0 ? previous : new Map()));
  }, [globalNoSpoilers, hiddenFollowKey, privacyChanged, resetRequired]);

  const reveal = useCallback((gameId: string) => {
    if (!gameId) return;
    setLevels((prev) => {
      if (prev.get(gameId) === FULL_REVEAL) return prev;
      const next = new Map(prev);
      next.set(gameId, FULL_REVEAL);
      return next;
    });
  }, []);

  const revealStep = useCallback((gameId: string) => {
    if (!gameId) return;
    setLevels((prev) => {
      const cur = prev.get(gameId) ?? 0;
      if (cur >= FULL_REVEAL) return prev;
      const next = new Map(prev);
      next.set(gameId, cur + 1);
      return next;
    });
  }, []);

  const isRevealed = useCallback(
    (gameId: string) =>
      !resetRequired && (levels.get(gameId) ?? 0) >= FULL_REVEAL,
    [levels, resetRequired]
  );

  const getRevealLevel = useCallback(
    (gameId: string) => (resetRequired ? 0 : levels.get(gameId) ?? 0),
    [levels, resetRequired]
  );

  const value = useMemo<RevealCtx>(
    () => ({ isRevealed, reveal, revealStep, getRevealLevel }),
    [isRevealed, reveal, revealStep, getRevealLevel]
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
  return {
    isRevealed: () => false,
    reveal: () => {},
    revealStep: () => {},
    getRevealLevel: () => 0,
  };
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
export function useFollowHidesGame(participants: SpoilerParticipants): boolean {
  const { follows } = useFollows();
  return followHidesParticipants(follows, participants);
}
