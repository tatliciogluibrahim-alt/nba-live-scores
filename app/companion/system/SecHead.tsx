//
// System D section head — the heavy 2px rule with an uppercase mono label
// and an optional right-aligned count. From d-mix / d-following `.sechead`:
// label 11px mono/600, ls .16em; count 10px mono, ls .12em, --mute-2;
// bottom rule 2px solid ink (the mock's --rule === --ink value, and in dark
// --ink flips to cream so the heavy rule stays visible).
//
// `help` renders the circled "?" affordance from d-following's Live-now head.

export function SecHead({
  name,
  count,
  help,
}: {
  name: string;
  count?: string;
  help?: boolean;
}) {
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

      {(count || help) && (
        <span
          className="inline-flex items-center tabular-nums lining-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--mute-2)",
          }}
        >
          {count}
          {help && (
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
          )}
        </span>
      )}
    </div>
  );
}
