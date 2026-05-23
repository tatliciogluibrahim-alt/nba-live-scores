"use client";

import { useMemo } from "react";
import { useFollows } from "../../providers";
import { NBA_TEAMS } from "../data/teams";
import { PickerScreen, type PickerOption } from "./PickerScreen";

export function TeamPicker() {
  const { isFollowing, addFollow, removeFollow } = useFollows();

  const options = useMemo<PickerOption[]>(() => {
    return NBA_TEAMS.map((t) => ({
      id: t.id,
      primary: `${t.city} ${t.name}`,
      secondary: `${t.conference}ern Conference`,
      mark: t.id,
      group: `${t.conference}ern Conference`,
      searchKeys: [t.id, t.name, t.city],
    }));
  }, []);

  return (
    <PickerScreen
      title="Follow a team."
      subtitle="Pick one or more. We&rsquo;ll surface only their games."
      options={options}
      isFollowing={(id) => isFollowing("team", id)}
      onSelect={(opt) => {
        if (isFollowing("team", opt.id)) {
          removeFollow("team", opt.id);
        } else {
          addFollow("team", opt.id);
        }
      }}
      searchPlaceholder="Search teams or cities"
    />
  );
}
