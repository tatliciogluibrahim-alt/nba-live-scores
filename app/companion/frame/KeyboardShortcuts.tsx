"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Desktop keyboard shortcuts for the leave-it-open glance tool. Gmail-style
// "g then <key>" to jump between tabs:
//   g t → Today   g f → Following   g w → Watching
//   g h → How it works   g s → Settings
//
// Desktop-only (a phone has no keyboard); ignored while typing in a field or
// with a modifier held, so it never hijacks real input or browser shortcuts.

const DESTS: Record<string, string> = {
  t: "/",
  f: "/following",
  w: "/watching",
  h: "/how-it-works",
  s: "/settings",
};

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      armed = false;
      if (timer) clearTimeout(timer);
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "g") {
        armed = true;
        if (timer) clearTimeout(timer);
        // Forget the prefix after a beat so a stray "g" doesn't lurk.
        timer = setTimeout(() => {
          armed = false;
        }, 1200);
        return;
      }
      if (armed && DESTS[k]) {
        e.preventDefault();
        disarm();
        router.push(DESTS[k]);
        return;
      }
      if (armed) disarm();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
