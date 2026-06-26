import { Eyebrow } from "../../atoms/Eyebrow";

// Small section label used between Today blocks. Keeps cards visually
// separated without competing with the one editorial moment per viewport.

export function SectionHeader({
  label,
  trailing,
}: {
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-3">
      {/* Section labels run a touch larger + darker than the base
          Eyebrow so the Today blocks read as clear sections (design
          feedback: these should pop a bit more).

          The Eyebrow is wrapped in a plain span so the letter-spaced text is
          NOT a direct flex item: older Chrome clips the first glyph of a
          letter-spaced flex/grid item ("YOU FOLLOW" → "OU FOLLOW"). With the
          wrapper as the flex item, the eyebrow renders in a normal inline
          context and the first letter is safe. */}
      <span className="shrink-0">
        <Eyebrow color="var(--ink)" style={{ fontSize: 12.5, letterSpacing: "0.1em" }}>
          {label}
        </Eyebrow>
      </span>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      {trailing}
    </div>
  );
}
