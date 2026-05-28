"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";

// No-Spoilers Pro — the paid-tier surface (Phase 23+, soft launch).
//
// Positioning (locked, do not inflate): the global No-Spoilers mode is
// and stays free. The free plan gives unlimited follows + alerts on
// your first 3 follows. "No-Spoilers Pro" is the paid pitch: unlimited
// alerts, framed honestly as helping cover the notification backend.
//
// No checkout, no price yet — a calm "coming soon / I'd want this"
// posture that matches the beta phase. Interest is stored locally
// (no list backend tonight); the card flips to a confirmed state and
// the copy stays honest about what that does ("we'll surface it here
// when it's ready," not "you're on a list").
//
// Voice: plain, no FOMO, no "most apps get this wrong." The negative
// (no ads either way) is the only contrast we draw.

const INTEREST_KEY = "nns:nospoilers-pro-interest:v1";

export function NoSpoilersProCard() {
  const { alertSlotCount, alertSlotCap, hydrated } = useFollows();
  const [interested, setInterested] = useState(false);
  const [ready, setReady] = useState(false);

  // Read persisted interest on mount (client only). Synchronizing
  // React state from localStorage (an external store) is exactly the
  // sanctioned use of an effect; the setState calls here run once on
  // mount and don't cascade.
  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(INTEREST_KEY) === "1";
    } catch {
      /* private mode / storage disabled — treat as not interested */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInterested(stored);
    setReady(true);
  }, []);

  if (!ready || !hydrated) return null;

  const slotsFull = alertSlotCount >= alertSlotCap;

  function markInterested() {
    setInterested(true);
    try {
      localStorage.setItem(INTEREST_KEY, "1");
    } catch {
      /* best-effort */
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>No-Spoilers Pro</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-4 py-4"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <p
          className="text-[14px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          Alerts on every follow.
        </p>
        <p
          className="mt-1.5 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {slotsFull
            ? `You're using all ${alertSlotCap} free alert slots. `
            : `The free plan covers alerts on your first ${alertSlotCap} follows. `}
          No-Spoilers Pro unlocks alerts on as many follows as you want.
          It helps cover the cost of running the notification backend. No
          ads either way.
        </p>

        {/* No-Spoilers itself stays free — say so plainly so the name
            doesn't imply the calm mode is going behind a paywall. */}
        <p
          className="mt-2 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          No-Spoilers mode stays free for everyone.
        </p>

        {interested ? (
          <p
            className="mt-3 text-[13px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Noted. We&apos;ll surface it here when it&apos;s ready.
          </p>
        ) : (
          <button
            type="button"
            onClick={markInterested}
            aria-label="Register interest in No-Spoilers Pro"
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            I&apos;d want this
          </button>
        )}
      </div>
    </section>
  );
}
