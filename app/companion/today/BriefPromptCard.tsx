"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";

// One-time, dismissible nudge toward the Daily Brief. Calm, no FOMO —
// it states the value once and gets out of the way. Dismissal (and
// tapping through to set it up) are both one-way: the card never returns
// for that install. Persisted in localStorage so we don't add another
// pref to the provider for a single transient card (same pattern as
// NoSpoilersProCard's interest flag).

const DISMISS_KEY = "nns:brief-prompt-dismissed:v1";

export function BriefPromptCard() {
  // Render nothing until we've read localStorage on the client, so the
  // card never flashes for users who already dismissed it.
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

  if (!ready || dismissed) return null;

  return (
    <>
      {/* Mobile: The Margin footer (System D, d-mix). A hairline-topped
          footer, not a card — heading + calm body + the same CTA buttons and
          handlers. */}
      <section
        className="md:hidden"
        style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}
      >
        <p
          className="text-[15px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          Want The Margin?
        </p>
        <p
          className="mt-1 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          A calm morning recap of what your follows did. No noise.
        </p>

        <div className="mt-3.5 flex items-center gap-2">
          <Link
            href="/brief/subscribe"
            onClick={dismiss}
            aria-label="Set up the Daily Brief email"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Set it up
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss the Brief prompt"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Not now
          </button>
        </div>
      </section>

      {/* Desktop: legacy card, unchanged (D4 owns the desktop restyle) */}
      <section
      className="hidden md:block rounded-[14px] border px-4 py-4"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <Eyebrow>Morning Brief</Eyebrow>
      <p
        className="mt-1.5 text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        Want this as a morning email?
      </p>
      <p
        className="mt-1 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        A calm recap of what your follows did, once a day. No noise.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Link
          href="/brief/subscribe"
          onClick={dismiss}
          aria-label="Set up the Daily Brief email"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Set it up
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the Brief prompt"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Not now
        </button>
      </div>
      </section>
    </>
  );
}
