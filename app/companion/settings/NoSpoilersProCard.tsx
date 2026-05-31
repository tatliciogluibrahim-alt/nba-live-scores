"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";

// No-Spoilers Pro — the paid-tier teaser (Phase 23+, soft launch).
//
// Positioning (locked, do not inflate): the GLOBAL No-Spoilers toggle is
// and stays free. The free plan gives unlimited follows + alerts on your
// first 3 follows. "No-Spoilers Pro" is the paid pitch: SELECTIVE
// per-follow No-Spoilers (hide only the teams you choose) plus alerts on
// every follow, framed honestly as helping cover the notification
// backend. During the beta the per-follow control is live for everyone.
//
// This is a calm teaser only — no checkout, no price, and (deliberately)
// no "I'd want this" button. A local-only interest tap told us nothing
// real and added a control that served no purpose, so it's gone. The
// card just names what's coming and stays quiet.
//
// Voice: plain, no FOMO, no "most apps get this wrong." The negative
// (no ads either way) is the only contrast we draw.

export function NoSpoilersProCard() {
  const { alertSlotCap, hydrated } = useFollows();
  if (!hydrated) return null;

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
      </div>
    </section>
  );
}
