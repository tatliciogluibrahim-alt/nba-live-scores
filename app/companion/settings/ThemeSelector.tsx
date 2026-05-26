"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";

// ThemeSelector — three-option pill row in Alerts & Notifications.
// "System" follows the OS dark-mode setting; "Light" pins cream;
// "Dark" pins warm dark.
//
// We write the chosen value to localStorage under `no-noise-theme`.
// The inline boot script in `app/layout.tsx` reads that key before
// paint and applies `data-theme` on <html>, which our `:root[data-
// theme="dark"]` block consumes. "System" means no `data-theme` attr —
// the `@media (prefers-color-scheme: dark)` block takes over.
//
// Persistence and the bootloader avoid a flash. The dark variant is
// warm dark, not pure black — preserving the cream identity.

const STORAGE_KEY = "no-noise-theme";

type ThemeChoice = "system" | "light" | "dark";
const OPTIONS: ThemeChoice[] = ["system", "light", "dark"];
const LABELS: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* private mode etc. */
  }
  return "system";
}

function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
}

export function ThemeSelector() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
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
      if (next === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
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
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-2 text-[12px] font-semibold transition active:scale-[0.97]"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--cream)" : "var(--ink)",
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
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
        {hydrated && choice === "system"
          ? "Follows your device's dark mode setting."
          : hydrated && choice === "dark"
            ? "Warm dark — the cream identity, after sundown."
            : "Cream chassis. The default daylight experience."}
      </p>
    </section>
  );
}
