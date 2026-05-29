"use client";

import { useMemo } from "react";
import { useFollows } from "../../providers";
import { WC_COUNTRIES } from "../data/countries";
import { PickerScreen, type PickerOption } from "./PickerScreen";

export function CountryPicker() {
  const { isFollowing, addFollow, removeFollow } = useFollows();

  const options = useMemo<PickerOption[]>(() => {
    return WC_COUNTRIES.map((c) => ({
      id: c.id,
      primary: c.name,
      secondary: `Group ${c.group}`,
      // Country code (e.g. USA), not the flag emoji — flags dropped from
      // the sports circle per design feedback.
      mark: c.id,
      group: `Group ${c.group}`,
      searchKeys: [c.id, c.name],
    }));
  }, []);

  return (
    <PickerScreen
      title="Follow a country."
      subtitle="Group context, opponents, the path to the final."
      options={options}
      isFollowing={(id) => isFollowing("country", id)}
      onSelect={(opt) => {
        if (isFollowing("country", opt.id)) {
          removeFollow("country", opt.id);
        } else {
          addFollow("country", opt.id);
        }
      }}
      searchPlaceholder="Search countries"
    />
  );
}
