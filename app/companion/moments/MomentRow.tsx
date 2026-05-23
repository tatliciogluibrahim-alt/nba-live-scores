import { Eyebrow } from "../atoms/Eyebrow";

// A "moment" is a typographic statement, not a card. Eyebrow + statement +
// optional context line. Stack of MomentRows replaces play-by-play as the
// default depth on the NBA Live Companion.

export function MomentRow({
  eyebrow,
  statement,
  context,
  accent,
  isLast = false,
}: {
  eyebrow: string;
  statement: string;
  context?: string;
  /** Optional 3px accent rail on the left of the row. */
  accent?: string;
  /** When true, hides the bottom border (use on the last row in a stack). */
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}
    >
      {accent ? (
        <div
          aria-hidden
          className="mt-1 w-[3px] self-stretch rounded-full"
          style={{ background: accent }}
        />
      ) : null}
      <div className="flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <p
          className="mt-1 text-[14px] leading-snug"
          style={{
            color: "var(--ink)",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          {statement}
        </p>
        {context ? (
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {context}
          </p>
        ) : null}
      </div>
    </div>
  );
}
