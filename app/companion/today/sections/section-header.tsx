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
      <Eyebrow>{label}</Eyebrow>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      {trailing}
    </div>
  );
}
