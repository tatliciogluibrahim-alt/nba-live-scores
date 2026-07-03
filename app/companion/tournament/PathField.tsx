import { PATH_STAGES, type PathData, type PathStageIdx } from "./path-data";

// YOUR PATH — the tournament page's ONE ink deployment (spec §6). The
// per-match progress rail (system/Rail) rescaled from clock minutes to
// tournament rounds: a personal, register-3 field showing how far the
// followed country has travelled toward the final. From d-tournament
// `.path`.
//
// Rail is intentionally NOT reused here: it is a fixed per-sport track
// (quarter/half ticks, KICKOFF/90′ end labels) with no custom-label API, so
// bending it to six named tournament stages would distort its contract.
// This is the sibling device — same visual grammar, tournament scale — built
// locally so Rail's per-match behaviour stays untouched.

// Uppercase pill for the current stage, shown at the right of the label row.
const STAGE_PILL: Record<PathStageIdx, string> = {
  0: "GROUP STAGE",
  1: "ROUND OF 32",
  2: "ROUND OF 16",
  3: "QUARTERFINAL",
  4: "SEMIFINAL",
  5: "FINAL",
};

export function PathField({ data }: { data: PathData }) {
  const { code, stageIdx, live, note } = data;
  // Accent fill reaches the current node. A sliver at the group stage (idx 0)
  // so the field never reads as "not started" while a country is in it.
  const fillPct = stageIdx === 0 ? 10 : stageIdx * 20;

  return (
    <section
      className="mt-[18px]"
      style={{
        background: "var(--ink-field-bg)",
        color: "var(--cream-on-ink)",
        padding: "16px 16px 18px",
      }}
      aria-label={`Your path${code ? ` for ${code}` : ""}`}
    >
      {/* Label row — left identity (bright), right stage + live (dim). */}
      <div
        className="mb-[16px] flex items-center justify-between uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
        }}
      >
        <span style={{ color: "var(--cream-on-ink)" }}>
          Your path{code ? ` · ${code}` : ""}
        </span>
        <span
          className="flex items-center gap-[6px]"
          style={{ color: "var(--cream-on-ink-dim)" }}
        >
          {STAGE_PILL[stageIdx]}
          {live ? (
            <>
              <span aria-hidden>·</span>
              <span
                aria-hidden
                className="no-noise-live-fade inline-block rounded-full"
                style={{ width: 5, height: 5, background: "var(--cream-on-ink)" }}
              />
              <span style={{ color: "var(--cream-on-ink)" }}>LIVE</span>
            </>
          ) : null}
        </span>
      </div>

      {/* The rail — a 2px track, an accent fill, six stage nodes. */}
      <div className="relative mx-[6px]" style={{ height: 2, background: "var(--line-on-ink)" }}>
        <div
          className="absolute bottom-0 left-0 top-0"
          style={{ width: `${fillPct}%`, background: "var(--wc)" }}
        />
        {PATH_STAGES.map((_, i) => {
          const state = i < stageIdx ? "done" : i === stageIdx ? "next" : "future";
          const bg =
            state === "done"
              ? "var(--wc)"
              : state === "next"
                ? "var(--cream-on-ink)"
                : "var(--ink-field-bg)";
          const borderColor =
            state === "done"
              ? "var(--wc)"
              : state === "next"
                ? "var(--cream-on-ink)"
                : "var(--cream-on-ink-dim)";
          return (
            <span
              key={i}
              aria-hidden
              // Glyph law (§5): the pulse means live, exclusively. The
              // current-stage node only breathes while the country plays.
              className={`absolute rounded-full ${state === "next" && live ? "no-noise-live-fade" : ""}`}
              style={{
                left: `${i * 20}%`,
                top: "50%",
                width: 7,
                height: 7,
                transform: "translate(-50%, -50%)",
                background: bg,
                border: `1.5px solid ${borderColor}`,
              }}
            />
          );
        })}
      </div>

      {/* Stage labels beneath each node. */}
      <div
        className="mt-[12px] flex justify-between uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.1em",
        }}
      >
        {PATH_STAGES.map((label, i) => {
          const color =
            i < stageIdx
              ? "var(--wc)"
              : i === stageIdx
                ? "var(--cream-on-ink)"
                : "var(--cream-on-ink-dim)";
          return (
            <span key={label} style={{ color }}>
              {label}
            </span>
          );
        })}
      </div>

      {/* The one calm timing line, cream. */}
      <p
        className="mt-[14px]"
        style={{ fontSize: 12, fontWeight: 600, color: "var(--cream-on-ink)" }}
      >
        {note}
      </p>
    </section>
  );
}
