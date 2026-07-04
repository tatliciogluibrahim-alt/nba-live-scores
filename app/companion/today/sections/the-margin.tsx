"use client";

import Link from "next/link";
import { SecHead } from "../../system/SecHead";
import { useBriefPrompt } from "../use-brief-prompt";

// The Margin — desktop right-rail footer for the Daily Brief nudge (D4b).
// The unboxed agate counterpart to the mobile BriefPromptCard footer: a
// SecHead over a calm body line and two mono link actions, no card. Shares
// dismissal with the mobile footer via useBriefPrompt, so setting it up (or
// dismissing) on either surface sticks. Mounted only in TodayClient's desktop
// aside; the mobile footer owns the same nudge below md.

export function TheMargin() {
  const { ready, dismissed, dismiss } = useBriefPrompt();

  if (!ready || dismissed) return null;

  return (
    <section>
      <SecHead name="The Margin" />
      <p
        className="mt-3 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        A calm morning recap of what your follows did. No noise.
      </p>

      <div className="mt-3.5 flex items-center gap-6">
        <Link
          href="/brief/subscribe"
          onClick={dismiss}
          aria-label="Set up the Daily Brief email"
          className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
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
            fontSize: 12,
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
