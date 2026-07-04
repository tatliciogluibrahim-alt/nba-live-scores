//
// System D section head — the heavy 2px rule with an uppercase mono label
// and an optional right-aligned count. From d-mix / d-following `.sechead`:
// label 11px mono/600, ls .16em; count 11px mono, ls .12em, --brand (C4 §5 v3);
// bottom rule 2px solid ink (the mock's --rule === --ink value, and in dark
// --ink flips to cream so the heavy rule stays visible).
//
// `help` renders the circled "?" affordance from d-following's Live-now head.
// `onHelp` (additive, optional) makes the "?" an interactive 44px button;
// existing call sites that pass only `help` retain the non-interactive span.

export function SecHead({
  name,
  count,
  help,
  onHelp,
}: {
  name: string;
  count?: string;
  help?: boolean;
  /** When supplied, the "?" affordance becomes a tappable button (44px hit
   *  area) that calls this handler. Existing call sites that omit `onHelp`
   *  keep the previous non-interactive span behaviour. */
  onHelp?: () => void;
}) {
  const showHelp = help || Boolean(onHelp);
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ paddingBottom: 8, borderBottom: "2px solid var(--ink)", marginBottom: 2 }}
    >
      <span
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "var(--ink)",
        }}
      >
        {name}
      </span>

      {(count || showHelp) && (
        <span
          className="inline-flex items-center tabular-nums lining-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--mute-2)",
          }}
        >
          {/* C4 (§5 v3): the section count is confident brand chrome. The "?"
              help affordance stays muted (it's a control, not a count). */}
          {count && (
            <span style={{ color: "var(--brand)", fontWeight: 700, fontSize: 11 }}>
              {count}
            </span>
          )}
          {showHelp && (
            onHelp ? (
              /* Interactive "?" — 44px tap target per §affordance law. */
              <button
                type="button"
                onClick={onHelp}
                aria-label="What do the alert tiers mean?"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
                  marginRight: -14,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "var(--mute-2)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    border: "1px solid var(--mute-2)",
                    borderRadius: 999,
                    padding: "0 5px",
                    lineHeight: "18px",
                  }}
                >
                  ?
                </span>
              </button>
            ) : (
              /* Non-interactive "?" — legacy behaviour, existing call sites. */
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  border: "1px solid var(--mute-2)",
                  borderRadius: 999,
                  padding: "0 5px",
                  marginLeft: 6,
                }}
              >
                ?
              </span>
            )
          )}
        </span>
      )}
    </div>
  );
}
