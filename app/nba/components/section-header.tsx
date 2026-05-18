import type { GameSection } from "../types";

export function SectionHeader({ section }: { section: GameSection }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <p className="shrink-0 font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#a89880]">
        {section.title}
      </p>
      <div className="flex-1 border-t border-[#d4cdc0]" />
    </div>
  );
}
