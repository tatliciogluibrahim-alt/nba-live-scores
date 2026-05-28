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
        <Eyebrow>Daily Brief</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <Link
        href="/brief/subscribe"
        aria-label="Set up the Daily Brief email"
        className="flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
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
            What your follows did, once a day. Skip the rest.
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--mute-1)"
          strokeWidth="2.4"
          aria-hidden
          className="shrink-0"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </section>
  );
}
