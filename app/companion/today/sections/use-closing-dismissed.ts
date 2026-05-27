"use client";

import { useCallback, useEffect, useState } from "react";

// Dismissal storage for the CalmEndCard ("calm endings" — series wrap
// and tournament wind-down). Each closing moment carries a stable id
// (e.g. "series:CLE-NYK", "tournament:nba-2026"). Once dismissed, the
// id is remembered locally and the card never re-renders for that
// moment again. New moments (a different series, a different season's
// tournament) get their own ids and surface fresh.
//
// Storage shape: JSON string array of dismissed ids. Capped at 50 to
// avoid unbounded growth across multiple seasons. New entries push out
// oldest entries when over cap.

const STORAGE_KEY = "nns:closing:dismissed:v1";
const CAP = 50;

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const capped = ids.slice(-CAP);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* quota / private mode — silently no-op */
  }
}

export function useClosingDismissed(): {
  hydrated: boolean;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
} {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // One-time localStorage hydration on client mount. Mirrors the
  // pattern used by useFollows/useUserPrefs in providers.tsx — the
  // React 19 set-state-in-effect rule discourages this generally, but
  // it is the documented Next.js solution for upgrading server-rendered
  // defaults to client-only localStorage state without breaking
  // hydration matching.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  const isDismissed = useCallback(
    (id: string) => dismissed.includes(id),
    [dismissed]
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeDismissed(next);
      return next;
    });
  }, []);

  return { hydrated, isDismissed, dismiss };
}
