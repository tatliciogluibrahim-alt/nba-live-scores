"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";

// ThemeSelector — two-option pill row in Alerts & Notifications.
// Light is the default. Dark is opt-in only — we don't follow the
// OS setting because we want the brand identity (cream chassis) to
// land consistently for every new user.
//
// We write "dark" to localStorage under `no-noise-theme` when the
// user opts in; absence (or "light") means cream. The inline boot
// script in `app/layout.tsx` reads the key before paint and applies
// `data-theme="dark"` on <html>, which our :root[data-theme="dark"]
// block consumes. The dark variant is warm dark, not pure black,
// preserving the cream identity after sundown.

const STORAGE_KEY = "no-noise-theme";

type ThemeChoice = "light" | "dark";
const OPTIONS: ThemeChoice[] = ["light", "dark"];
const LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
};

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "dark") return "dark";
  } catch {
    /* private mode etc. */
  }
  return "light";
}

function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (choice === "light") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", "dark");
  }
}

export function ThemeSelector() {
  const [choice, setChoice] = useState<ThemeChoice>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readStored();
    // Read-once-on-mount hydration. The setState-in-effect rule
    // discourages this pattern in general, but we can't read
    // localStorage during the initial render (SSR) — the value
    // genuinely arrives from an external system on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(initial);
    setHydrated(true);
  }, []);

  function pick(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
    try {
      if (next === "light") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, "dark");
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <section aria-label="Theme">
      <Eyebrow>Theme</Eyebrow>
      <div
        className="mt-2 flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Theme"
      >
        {OPTIONS.map((opt) => {
          const active = hydrated && choice === opt;
          const isLight = opt === "light";
          // Each button previews the theme it selects, using literal
          // colors (not tokens) so the swatch stays true regardless of
          // the currently-applied theme. The selected option gets an
          // orange ring. (Before: the active option always used a dark
          // --ink fill, so "Light" sat in a dark box — backwards.)
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-2 text-[12px] font-semibold transition active:scale-[0.97]"
              style={{
                background: isLight ? "#faf5e8" : "#14100c",
                color: isLight ? "#1a1612" : "#efe6d2",
                border: `2px solid ${active ? "#e55b2a" : "transparent"}`,
                boxShadow: active ? "none" : "inset 0 0 0 1px var(--line)",
              }}
            >
              {LABELS[opt]}
            </button>
          );
        })}
      </div>
      <p
        className="mt-2 text-[11px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {hydrated && choice === "dark"
          ? "Warm dark — the cream identity, after sundown."
          : "Cream chassis. The default daylight experience."}
      </p>
    </section>
  );
}
