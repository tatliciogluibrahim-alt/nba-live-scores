"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePinned } from "../providers";

// Desktop power-user keyboard navigation for /game/[id]. Invisible —
// renders nothing, just attaches a keydown listener.
//
//   [  → previous pinned game
//   ]  → next pinned game
//
// Only meaningful when the user has 2+ pinned games and is currently
// viewing one of them. Wraps around the ends (last → first). No-ops
// when the current game isn't pinned (you can't step through a list
// you're not part of) or when there's only one pin.
//
// Deliberately scoped to bracket keys — they're unmodified, rarely
// used by the browser, and don't collide with typing because we bail
// when focus is in a text field. `r` (reveal scores) was considered
// but there's no page-level spoiler-reveal bus yet (each spoiler
// component owns its own reveal state), so that shortcut is deferred
// until a reveal context exists.

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function GameKeyboardNav({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { pinned } = usePinned();

  useEffect(() => {
    if (pinned.length < 2) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "[" && e.key !== "]") return;
      // Don't hijack bracket keys while the user is typing or holding
      // a modifier (e.g. ⌘] is a browser/OS shortcut).
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const ids = pinned.map((p) => p.gameId);
      const idx = ids.indexOf(gameId);
      if (idx === -1) return; // current game isn't pinned — nothing to step through

      const delta = e.key === "]" ? 1 : -1;
      const nextIdx = (idx + delta + ids.length) % ids.length;
      const nextId = ids[nextIdx];
      if (nextId && nextId !== gameId) {
        e.preventDefault();
        router.push(`/game/${nextId}`);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameId, pinned, router]);

  return null;
}
