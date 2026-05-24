"use client";

import { Display } from "../atoms/Display";
import { ReminderSelector } from "./ReminderSelector";
import { QuietHoursSelector } from "./QuietHoursSelector";
import { PerFollowAlerts } from "./PerFollowAlerts";
import { WatchGuidanceBlock } from "./WatchGuidanceBlock";

// Watch + Alerts — single calm settings-style screen.
//
// Stage 14G: removed the No-Spoilers section. The inline chip on the
// Today header is now the canonical control for that mode; duplicating
// it here read as a setting that lived in two places. State persists
// via useUserPrefs() either way.

export function SettingsClient() {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-2">
        Watch + Alerts.
      </Display>
      <p
        className="mb-5 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Reminders, quiet hours, and per-follow alert presets.
      </p>

      <div className="space-y-5">
        <ReminderSelector />
        <QuietHoursSelector />
        <PerFollowAlerts />
        <WatchGuidanceBlock />
      </div>
    </main>
  );
}
