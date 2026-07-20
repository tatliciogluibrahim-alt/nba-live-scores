"use client";

import { useMemo } from "react";
import { useFollows } from "../../providers";
import { NFL_TEAMS } from "../data/nfl-teams";
import { PickerScreen, type PickerOption } from "./PickerScreen";

const NFL_MOMENT = "nfl-season-2026";

// The NFL team picker (Phase 22 gate 3). Same PickerScreen grammar as the
// NBA team picker, but every follow is created CANONICAL — momentId +
// scope + entity — via addMomentFollow, and membership is checked with
// isFollowingMoment. This is what makes an NFL "LAC" (Chargers) provably
// distinct from the NBA "LAC" (Clippers) from the first tap; a legacy
// (kind,id) check could not tell them apart.
export function NFLTeamPicker() {
  const { isFollowingMoment, addMomentFollow, removeMomentFollow } = useFollows();

  const options = useMemo<PickerOption[]>(
    () =>
      NFL_TEAMS.map((t) => ({
        id: t.id,
        primary: `${t.city} ${t.name}`,
        secondary: t.division,
        mark: t.id,
        group: t.division,
        searchKeys: [t.id, t.name, t.city],
      })),
    []
  );

  return (
    <PickerScreen
      title="Follow a team."
      subtitle="Pick one or more. We&rsquo;ll surface only their games."
      options={options}
      isFollowing={(id) => isFollowingMoment(NFL_MOMENT, "team", id)}
      onSelect={(opt) => {
        if (isFollowingMoment(NFL_MOMENT, "team", opt.id)) {
          removeMomentFollow(NFL_MOMENT, "team", opt.id);
        } else {
          addMomentFollow(NFL_MOMENT, "team", opt.id);
        }
      }}
      searchPlaceholder="Search teams or cities"
    />
  );
}
