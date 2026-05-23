import type { ReactNode } from "react";

// One pill grammar across the app. Tones: live / upcoming / final / current.
// Copy is one or two short words. Never sentences in pills.

export type StatusTone = "live" | "upcoming" | "final" | "current";

type ToneStyle = { bg: string; fg: string; dot: string | null };

const TONE: Record<StatusTone, ToneStyle> = {
  live: {
    bg: "var(--status-live-bg)",
    fg: "var(--status-live-fg)",
    dot: "var(--status-live-dot)",
  },
  upcoming: {
    bg: "var(--status-upcoming-bg)",
    fg: "var(--status-upcoming-fg)",
    dot: "var(--status-upcoming-dot)",
  },
  final: {
    bg: "var(--status-final-bg)",
    fg: "var(--status-final-fg)",
    dot: null,
  },
  current: {
    bg: "var(--status-current-bg)",
    fg: "var(--status-current-fg)",
    dot: "var(--status-current-dot)",
  },
};

export function StatusPill({
  tone = "final",
  breathe = false,
  children,
}: {
  tone?: StatusTone;
  /** Pulse animation — use only on live tone. */
  breathe?: boolean;
  children: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold leading-snug ${
        breathe ? "no-noise-live-fade" : ""
      }`}
      style={{ background: t.bg, color: t.fg }}
    >
      {t.dot ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: t.dot }}
        />
      ) : null}
      {children}
    </span>
  );
}
