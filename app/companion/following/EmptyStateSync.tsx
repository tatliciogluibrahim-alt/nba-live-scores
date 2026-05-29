"use client";

import { useState } from "react";
import { useFollows } from "../providers";
import { SyncCircleModal } from "./SyncCircleModal";

// Empty-state Sync entry. A fresh install / new device (e.g. the iOS
// native app, whose WebView storage is separate from an installed PWA)
// starts with zero follows and so renders FollowingEmpty — which had no
// way to pull an existing circle. This dashed-link button opens the
// SyncCircleModal so a new device can restore its circle by code in one
// step, without first having to manually add a follow.

export function EmptyStateSync() {
  const { follows } = useFollows();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
        style={{
          background: "transparent",
          borderColor: "var(--mute-2)",
          color: "var(--ink)",
        }}
        aria-label="Sync your circle from another device with a code"
      >
        <span className="text-[13px]" style={{ fontWeight: 600 }}>
          Already have a circle?
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Sync with a code
        </span>
      </button>
      {open ? (
        <SyncCircleModal follows={follows} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
