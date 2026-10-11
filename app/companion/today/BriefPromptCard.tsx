"use client";

import Link from "next/link";
import { useBriefPrompt } from "./use-brief-prompt";

// One-time, dismissible nudge toward the Daily Brief ("The Margin"). Calm,
// no FOMO — it states the value once and gets out of the way. Dismissal (and
// tapping through to set it up) are both one-way: the nudge never returns for
// that install.
//
// This is the MOBILE surface: The Margin footer at the foot of the Today
// slate (System D, d-mix) — a hairline-topped footer, not a card. On desktop
// (md+) it hides; the right-rail TheMargin carries the same nudge instead,
// sharing the dismiss state via useBriefPrompt.

export function BriefPromptCard() {
  const { ready, dismissed, dismiss } = useBriefPrompt();

  if (!ready || dismissed) return null;

  return (
    <section
      className="md:hidden"
      style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}
    >
      <p
        className="text-[0.9375rem] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        Want The Margin?
      </p>
      <p
        className="mt-1 text-[0.8125rem] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        A calm morning recap of what your follows did. No noise.
      </p>

      {/* Mono link actions (System D, D3 Task 6a) — this footer is a moment
          among the Today slate, not the screen's sole CTA, so the actions
          read as editorial links, not pills. */}
      <div className="mt-3.5 flex items-center gap-6">
        <Link
          href="/brief/subscribe"
          onClick={dismiss}
          aria-label="Set up the Daily Brief email"
          className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--ink)",
          }}
        >
          Set it up
          <span aria-hidden>→</span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the Brief prompt"
          className="inline-flex min-h-[44px] items-center uppercase transition active:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--mute-1)",
            background: "transparent",
            border: "none",
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}
