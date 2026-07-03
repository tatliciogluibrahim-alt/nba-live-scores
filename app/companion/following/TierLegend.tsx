//
// TierLegend — one-time educational row that appears under the first
// tier-stamped section head. The parent (FollowingMobile) controls
// visibility so the same "?" affordance on the section head can
// re-open it from any state.
//
// Visual: mono agate, muted-2, hairline top+bottom, ✕ right-aligned.
// Copy (exact, locked): "QUIET: start and final. COMPANION: key moments.
//   FULL DETAILS: everything."

const LEGEND_COPY =
  "QUIET: start and final. COMPANION: key moments. FULL DETAILS: everything.";

const MONO_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: "var(--mute-2)",
} as const;

export function TierLegend({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <div
      role="note"
      aria-label="Alert tier key"
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        padding: "9px 0",
      }}
    >
      <span style={MONO_STYLE}>{LEGEND_COPY}</span>

      {/* ✕ dismiss. 44×44 tap target wraps a small glyph so taps
          along the edge of the row don't miss. */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tier legend"
        style={{
          ...MONO_STYLE,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 44,
          minHeight: 44,
          margin: "-9px -4px -9px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
