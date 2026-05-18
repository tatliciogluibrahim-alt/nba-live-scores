/* eslint-disable @next/next/no-img-element */

import type { Team } from "../types";

export function TeamLogo({ team }: { team: Team }) {
  if (!team.logo) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600 sm:h-9 sm:w-9">
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e8e0d4] sm:h-9 sm:w-9">
      <img
        src={team.logo}
        alt={`${team.name} logo`}
        className="h-6 w-6 object-contain"
        loading="lazy"
      />
    </div>
  );
}
