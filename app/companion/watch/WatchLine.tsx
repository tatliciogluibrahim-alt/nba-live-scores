"use client";

// Canonical Where-to-Watch line. Two slots: channel · stream + small
// "Remind" toggle. One per screen — do not repeat. (HANDOFF.md §4.7)

export function WatchLine({
  channel,
  stream,
  onRemind,
  reminded = false,
  ariaSubject,
}: {
  channel: string;
  /** Optional streaming app, e.g. "Peacock". */
  stream?: string;
  /** Tap handler for Remind button. Omit to hide the button entirely. */
  onRemind?: () => void;
  reminded?: boolean;
  /** Used to build the Remind button's aria-label. */
  ariaSubject?: string;
}) {
  const label = stream ? `${channel} · ${stream}` : channel;

  const remindLabel = reminded
    ? ariaSubject
      ? `Reminder on for ${ariaSubject}`
      : "Reminder on"
    : ariaSubject
      ? `Set reminder for ${ariaSubject}`
      : "Set reminder";

  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
      style={{ background: "var(--cream-2)" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--mute-1)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M9 22h6M12 19v3" />
      </svg>

      <span
        className="min-w-0 flex-1 truncate text-[13px]"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {label}
      </span>

      {onRemind ? (
        <button
          type="button"
          onClick={onRemind}
          aria-label={remindLabel}
          aria-pressed={reminded}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-[0.97]"
          style={
            reminded
              ? {
                  background: "var(--ink)",
                  color: "var(--cream)",
                  border: "1px solid var(--ink)",
                }
              : {
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                }
          }
        >
          {reminded ? "✓ On" : "Remind"}
        </button>
      ) : null}
    </div>
  );
}
