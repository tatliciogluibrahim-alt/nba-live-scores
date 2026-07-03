import type { ReactNode } from "react";

// System D ink field — the third register rung as an elevated panel. From
// d-mix `.inkband`: 16px 18px 8px padding, an uppercase 10px mono label
// (cream-on-ink-dim, ls .16em) with an optional breathing cream dot, then
// board rows separated by cream hairlines (--line-on-ink, none above the
// first — handled by the divide below).
//
// The surface reads via --ink-field-bg: solid ink in light mode, the raised
// --paper panel in dark (spec §9), so it stays legible as elevation rather
// than a black hole against a dark page. Cream-on-ink text tokens hold their
// values in both themes because they sit on this panel either way.

export function InkField({
  label,
  live,
  children,
}: {
  label: string;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--ink-field-bg)",
        color: "var(--cream-on-ink)",
        padding: "16px 18px 8px",
      }}
    >
      <div
        className="mb-[6px] flex items-center gap-2 uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "var(--cream-on-ink-dim)",
        }}
      >
        {live && (
          <span
            aria-hidden
            className="no-noise-live-fade inline-block rounded-full"
            style={{ width: 6, height: 6, background: "var(--cream)" }}
          />
        )}
        {label}
      </div>

      <div className="[&>*+*]:border-t [&>*+*]:border-[color:var(--line-on-ink)]">{children}</div>
    </div>
  );
}
