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
          feedback: these should pop a bit more). */}
      <Eyebrow color="var(--ink)" style={{ fontSize: 12.5, letterSpacing: "0.1em" }}>
        {label}
      </Eyebrow>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      {trailing}
    </div>
  );
}
