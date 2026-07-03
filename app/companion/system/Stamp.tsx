//
// System D stamp — the small mono badge that does semantic work. In the
// mocks it IS the status (FT / 40' / COMPANION / OFF). Four fills map to
// the d-following ladder plus the d-mix ink-field badge:
//   filled  → .stamp.on   (ink fill, cream text) — an active state
//   outline → .stamp.q    (ink border + ink text) — a quiet/partial state
//   faint   → .stamp.off  (mute border + mute text) — an off/at-rest state
//   onInk   → .inkband .stamp (cream-on-ink border + text) — inside ink fields
//
// Geometry from d-mix: 10px mono/700, ls .1em, min-width 38px, 3px 6px pad.
// Border kept 1px on every variant (filled borders in its own fill colour)
// so a row of mixed stamps shares one outer height.

type StampVariant = "filled" | "outline" | "faint" | "onInk";

const VARIANTS: Record<
  StampVariant,
  { background: string; color: string; borderColor: string }
> = {
  filled: { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" },
  outline: { background: "transparent", color: "var(--ink)", borderColor: "var(--ink)" },
  faint: { background: "transparent", color: "var(--mute-2)", borderColor: "var(--mute-2)" },
  onInk: {
    background: "transparent",
    color: "var(--cream-on-ink)",
    borderColor: "var(--cream-on-ink-dim)",
  },
};

export function Stamp({ text, variant }: { text: string; variant: StampVariant }) {
  const v = VARIANTS[variant];
  return (
    <span
      className="inline-block whitespace-nowrap text-center tabular-nums lining-nums"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        minWidth: 38,
        padding: "3px 6px",
        border: `1px solid ${v.borderColor}`,
        background: v.background,
        color: v.color,
      }}
    >
      {text}
    </span>
  );
}
