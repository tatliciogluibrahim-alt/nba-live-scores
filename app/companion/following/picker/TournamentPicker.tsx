"use client";

import { useMemo } from "react";
import { useFollows } from "../../providers";
import { TOURNAMENTS } from "../data/tournaments";
import { PickerScreen, type PickerOption } from "./PickerScreen";

export function TournamentPicker() {
  const { isFollowing, addFollow, removeFollow } = useFollows();

  const options = useMemo<PickerOption[]>(() => {
    return TOURNAMENTS.map((t) => ({
      id: t.id,
      primary: t.name,
      secondary: t.detail,
      // The hand-picked chip, never a name slice — slicing produced "SUM"
      // for "Summer Soccer 2026" (the chip field exists for exactly this).
      mark: t.chip,
    }));
  }, []);

  return (
    <PickerScreen
      title="Follow a tournament."
      subtitle="The whole bracket. Every round, every clinch."
      options={options}
      isFollowing={(id) => isFollowing("tournament", id)}
      onSelect={(opt) => {
        if (isFollowing("tournament", opt.id)) {
          removeFollow("tournament", opt.id);
        } else {
          addFollow("tournament", opt.id);
        }
      }}
      searchPlaceholder="Search tournaments"
      emptyMessage="No tournaments to follow yet."
    />
  );
}
