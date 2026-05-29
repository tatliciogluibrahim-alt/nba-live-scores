"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";

// Settings entry point to the Daily Brief subscribe page. Always present
// (the calm, go-looking home for it) — the Today card handles one-time
// discovery. No subscription-status check here: the app doesn't know the
// user's email, so we link to /brief/subscribe which is idempotent
// (re-subscribing just refreshes the follow snapshot).

export function BriefSettingsRow() {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow color="var(--nba)">Daily Brief</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {/* Orange-accented so it pops in the settings stack: soft NBA
          tint, a 3px accent rail, and an orange chevron. The Brief is a
          retention surface, worth a little more visual pull than the
          neutral rows around it. */}
      <Link
        href="/brief/subscribe"
        aria-label="Set up the Daily Brief email"
        className="flex items-stretch gap-3 overflow-hidden rounded-[14px] border transition active:scale-[0.99]"
        style={{ background: "var(--nba-soft)", borderColor: "var(--nba)" }}
      >
        <span
          aria-hidden
          className="w-[3px] shrink-0"
          style={{ background: "var(--nba)" }}
        />
        <div className="flex flex-1 items-center justify-between gap-3 py-3 pr-4">
          <div className="min-w-0">
            <p
              className="text-[14px] leading-snug"
              style={{ color: "var(--ink)", fontWeight: 700 }}
            >
              A calm morning email.
            </p>
            <p
              className="mt-0.5 text-[12px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Your follows, once a day.
            </p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--nba)"
            strokeWidth="2.4"
            aria-hidden
            className="shrink-0"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </Link>
    </section>
  );
}
