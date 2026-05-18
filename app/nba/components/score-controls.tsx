"use client";

import { useState } from "react";
import type { FavoriteTeamOption } from "../types";
import { triggerLightHaptic } from "../lib/haptics";

export function FilterPill({
  label,
  compactLabel,
  count,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  compactLabel?: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        triggerLightHaptic();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-7 w-auto shrink-0 min-w-0 overflow-visible items-center justify-center rounded-full px-2 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] transition active:scale-[0.98] sm:h-8 sm:px-3 sm:text-[0.76rem] ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
          : "bg-[#e8e2d8] text-[#8a7a66] ring-1 ring-[#d4cdc0] hover:bg-[#ddd7cc]"
      } ${disabled ? "pointer-events-none opacity-20" : ""}`}
    >
      <span className="flex items-center justify-center gap-1">
        <span className="whitespace-nowrap">{compactLabel ?? label}</span>

        {typeof count === "number" && (
          <span
            className={`rounded-full px-1 py-0.5 text-[0.62rem] leading-none ${
              active ? "bg-white/20 text-white/90" : "bg-[#1a1208]/8 text-[#8a7a66]"
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

export function FavoriteTeamPicker({
  teams,
  favoriteTeamAbbr,
  onChange,
}: {
  teams: FavoriteTeamOption[];
  favoriteTeamAbbr: string | null;
  onChange: (teamAbbreviation: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTeam = teams.find((team) => team.abbreviation === favoriteTeamAbbr);

  return (
    <div
      className="relative min-w-0 shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => {
          triggerLightHaptic();
          setIsOpen((current) => !current);
        }}
        className="flex h-7 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#e8e2d8] pl-2 pr-1.5 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] text-[#8a7a66] ring-1 ring-[#d4cdc0] transition hover:bg-[#ddd7cc] active:scale-[0.98] sm:h-8 sm:pl-3 sm:text-[0.76rem]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-[#a89880]">Team</span>
        <span className="text-[#1a1208]">
          {selectedTeam ? selectedTeam.abbreviation : "Pick"}
        </span>
        <span className="text-[0.6rem] text-[#a89880]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-[1rem] border border-[#d4cdc0] bg-[#ffffff] py-1.5 shadow-xl shadow-black/10 ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              onChange(null);
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-2 text-left font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide transition hover:bg-[#f0ece4] ${
              !favoriteTeamAbbr ? "text-orange-600" : "text-[#a89880]"
            }`}
          >
            Pick
          </button>

          <div className="max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {teams.map((team) => (
              <button
                key={team.abbreviation}
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  onChange(team.abbreviation);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-[#f0ece4] ${
                  favoriteTeamAbbr === team.abbreviation
                    ? "text-orange-600"
                    : "text-[#1a1208]"
                }`}
              >
                <span className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide">
                  {team.abbreviation}
                </span>
                <span className="truncate text-xs font-semibold normal-case tracking-normal text-[#a89880]">
                  {team.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
