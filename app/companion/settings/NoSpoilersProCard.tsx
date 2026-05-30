"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";

// No-Spoilers Pro — the paid-tier surface (Phase 23+, soft launch).
//
// Positioning (locked, do not inflate): the GLOBAL No-Spoilers toggle is
// and stays free. The free plan gives unlimited follows + alerts on your
// first 3 follows. "No-Spoilers Pro" is the paid pitch: SELECTIVE
// per-follow No-Spoilers (hide only the teams you choose) plus alerts on
// every follow, framed honestly as helping cover the notification
// backend. During the beta the per-follow control is live for everyone;
// this card registers interest in the eventual paid tier.
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
  const { alertSlotCap, hydrated } = useFollows();
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
        <Eyebrow>Future Pro Features</Eyebrow>
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
          Coming later.
        </p>
        <ul
          className="mt-2 space-y-1 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          <li>• Alerts on every follow (free covers your first {alertSlotCap}).</li>
          <li>• Selective No-Spoilers, per follow.</li>
          <li>• No ads, either way.</li>
        </ul>

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
            aria-label="Register interest in future pro features"
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
