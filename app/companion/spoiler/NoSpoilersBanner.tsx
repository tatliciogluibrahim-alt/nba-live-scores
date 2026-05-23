"use client";

import { useNoSpoilers } from "../providers";

// Ink-on-cream banner shown at the top of Today when No-Spoilers is on.
// Communicates the mode without making it noisy.
// (REFINEMENT.md §1.3 / HANDOFF.md §6)

export function NoSpoilersBanner({ className }: { className?: string }) {
  const noSpoilers = useNoSpoilers();
  if (!noSpoilers) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${className ?? ""}`}
      style={{
        background: "var(--ink)",
        color: "var(--cream)",
      }}
    >
      <div className="flex-1">
        <p
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--cream)",
            opacity: 0.7,
          }}
        >
          No-Spoilers
        </p>
        <p
          className="mt-0.5 text-[12px] leading-snug"
          style={{ color: "var(--cream)", fontWeight: 500 }}
        >
          Scores hidden · push previews redacted · schedule still visible
        </p>
      </div>
      <span
        aria-hidden
        className="shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] uppercase"
        style={{
          background: "var(--cream)",
          color: "var(--ink)",
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        On
      </span>
    </div>
  );
}
