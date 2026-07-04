"use client";

import { useEffect, useState } from "react";

// One source of truth for the Daily Brief ("The Margin") nudge dismissal.
// Two surfaces read it: BriefPromptCard (the mobile footer at the foot of the
// Today slate) and TheMargin (the desktop right-rail footer). Only one is
// visible at a given width, but they share this key so dismissing on either
// surface stays dismissed on the other. Persisted in localStorage so we don't
// add another pref to the provider for a single transient nudge.

const DISMISS_KEY = "nns:brief-prompt-dismissed:v1";

export function useBriefPrompt(): {
  ready: boolean;
  dismissed: boolean;
  dismiss: () => void;
} {
  // Render nothing until we've read localStorage on the client, so the nudge
  // never flashes for users who already dismissed it.
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* private mode — treat as not dismissed */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(stored);
    setReady(true);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* best-effort */
    }
  }

  return { ready, dismissed, dismiss };
}
