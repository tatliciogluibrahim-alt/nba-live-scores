"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { useIsNative } from "../dev/native-detect";

// Calm empty state. "Track" language is deliberate (vs "watch") so users
// understand this isn't a TV destination. Title kept short + standard;
// body explains the verb without trying to sell the room.

export function WatchingEmpty() {
  const native = useIsNative();
  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Watching.
      </Display>
      {/* Empty-state direction. Mirrors the muted secondary text used
          elsewhere (Today's "Tell us who you follow" sub, Settings
          row helpers). Tells the user where to act without nagging. */}
      <p
        className="mb-2 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Track a game from Following to see it here.
      </p>
      {native ? (
        // Native only: teaches the lock-screen / widget payoff of tracking a
        // live game. The web/PWA has neither surface, so it stays hidden.
        <p
          className="mb-5 text-[13px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          Track a live game to follow the score on your lock screen and
          home-screen widget.
        </p>
      ) : (
        <div className="mb-5" />
      )}

      {/* Suggestions — agate rows, not cards. Hairline-ruled, unboxed, each
          a mono note under the label with a → chevron at the row edge. */}
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <Link
          href="/"
          className="flex min-h-[52px] items-center justify-between gap-3 border-t py-3 transition active:opacity-70"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          aria-label="Go to Today"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[14px]" style={{ fontWeight: 600 }}>
              See what&apos;s on Today
            </span>
            <span
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--mute-2)",
              }}
            >
              Worth checking now
            </span>
          </span>
          <span aria-hidden className="text-[16px]" style={{ color: "var(--mute-1)" }}>
            →
          </span>
        </Link>

        <Link
          href="/following"
          className="flex min-h-[52px] items-center justify-between gap-3 border-t py-3 transition active:opacity-70"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          aria-label="Go to Following"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[14px]" style={{ fontWeight: 600 }}>
              Set up Following
            </span>
            <span
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--mute-2)",
              }}
            >
              Teams, countries, series, tournaments
            </span>
          </span>
          <span aria-hidden className="text-[16px]" style={{ color: "var(--mute-1)" }}>
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
