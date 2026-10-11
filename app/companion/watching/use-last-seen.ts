"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LAST_SEEN_KEY,
  parseSeenMap,
  recordSeen,
  scoreSinceLastLook,
  type SinceLastLook,
} from "./last-seen";

// The browser half of Watching's "what changed since your last look"
// (persona sweep, 2026-10-11). The pure diff lives in last-seen.ts.
//
// A "look" starts when the row mounts or the page comes back to the
// foreground. Its baseline is the last score you saw. If the score moved,
// the row tints it and adds "Was 7–6". That clears once the row has been
// on screen for about three seconds (the timer restarts when the score
// changes, so a refresh that lands a beat after you return still gets its
// three seconds). After that the look is settled and live changes are
// simply seen, with no line. Leaving the page records what was on screen,
// so a change shown once never shows again on the next visit.
//
// A game hidden by No-Spoilers at the start of a look gets nothing for that
// look, and a hidden score is never recorded as seen.

const SEEN_AFTER_MS = 3000;
const NONE: SinceLastLook = { changed: false, was: null };

type Score = { away: number; home: number };
type Look = { baseline: Score | null; settled: boolean; blind: boolean };

function readSeen(gameId: string): Score | null {
  try {
    const seen = parseSeenMap(window.localStorage.getItem(LAST_SEEN_KEY))[gameId];
    return seen ? { away: seen.away, home: seen.home } : null;
  } catch {
    return null;
  }
}

function writeSeen(gameId: string, score: Score): void {
  try {
    const map = parseSeenMap(window.localStorage.getItem(LAST_SEEN_KEY));
    const next = recordSeen(map, gameId, score, Date.now());
    window.localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the line just never shows */
  }
}

function startLook(gameId: string, hidden: boolean): Look {
  if (hidden || typeof window === "undefined") {
    return { baseline: null, settled: true, blind: true };
  }
  return { baseline: readSeen(gameId), settled: false, blind: false };
}

function pageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function useSinceLastLook(
  gameId: string,
  away: number | null,
  home: number | null,
  hidden: boolean
): { since: SinceLastLook; ref: (node: HTMLElement | null) => void } {
  const [look, setLook] = useState<Look>(() => startLook(gameId, hidden));
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);

  const hasScore = away != null && home != null;
  const since =
    look.blind || look.settled
      ? NONE
      : scoreSinceLastLook(look.baseline, { away, home }, hidden);

  // Latest values for the page-leave and page-return listeners.
  const latest = useRef({ away, home, hidden });
  useEffect(() => {
    latest.current = { away, home, hidden };
  });

  // On screen: at least 60% of the row in view.
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.6 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node]);

  // A look settles once the row has been on screen for three seconds. The
  // timer restarts when the score changes during the look.
  useEffect(() => {
    if (look.settled || !onScreen) return;
    const t = setTimeout(() => {
      if (pageVisible()) setLook((l) => ({ ...l, settled: true }));
    }, SEEN_AFTER_MS);
    return () => clearTimeout(t);
  }, [look.settled, onScreen, away, home]);

  // Record what is on screen as seen, unless a change is still waiting to
  // be noticed (then the look settling, or leaving, records it).
  useEffect(() => {
    if (hidden || !hasScore || since.changed || !pageVisible()) return;
    writeSeen(gameId, { away: away as number, home: home as number });
  }, [gameId, away, home, hidden, hasScore, since.changed, look.settled]);

  // Leaving records what was on screen, so the next visit starts from it.
  // Coming back starts a new look against that.
  useEffect(() => {
    const leave = () => {
      const { away: a, home: h, hidden: hid } = latest.current;
      if (!hid && a != null && h != null) writeSeen(gameId, { away: a, home: h });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setLook(startLook(gameId, latest.current.hidden));
      } else {
        leave();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      leave();
    };
  }, [gameId]);

  return { since, ref };
}
