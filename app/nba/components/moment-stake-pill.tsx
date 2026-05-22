import type { MomentStake } from "../lib/moment-intelligence";

function getMomentStakeClasses(stake: MomentStake, surface: "light" | "dark") {
  if (surface === "dark") {
    if (stake.tone === "urgent") {
      return "bg-orange-300 text-[#1a1208] ring-orange-200";
    }
    if (stake.tone === "live") {
      return "bg-orange-100 text-orange-900 ring-orange-200";
    }
    if (stake.tone === "complete") {
      return "bg-emerald-200 text-emerald-950 ring-emerald-100";
    }

    return "bg-white/10 text-white ring-white/20";
  }

  if (stake.tone === "urgent") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }
  if (stake.tone === "live") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }
  if (stake.tone === "complete") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (stake.tone === "calm") {
    return "bg-[#f0ece4] text-[#8a7a66] ring-[#d4cdc0]";
  }

  return "bg-white text-[#8a7a66] ring-[#e8e0d4]";
}

export function MomentStakePill({
  stake,
  surface = "light",
}: {
  stake: MomentStake;
  surface?: "light" | "dark";
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase leading-none ring-1 ${getMomentStakeClasses(
        stake,
        surface
      )}`}
    >
      {stake.tone === "live" && (
        <span className="no-noise-live-fade h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      <span className="truncate">{stake.label}</span>
    </span>
  );
}
