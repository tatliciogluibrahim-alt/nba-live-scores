"use client";

import { Display } from "../atoms/Display";
import { NoSpoilersToggle } from "./NoSpoilersToggle";
import { ReminderSelector } from "./ReminderSelector";
import { QuietHoursSelector } from "./QuietHoursSelector";
import { PerFollowAlerts } from "./PerFollowAlerts";
import { WatchGuidanceBlock } from "./WatchGuidanceBlock";

// Watch + Alerts — single calm settings-style screen. Mirrors the order
// HANDOFF.md §1 §5 §6 specify: signature mode on top, then reminders,
// then per-follow presets, then where-to-watch explainer.
//
// This screen never renders scores itself, so there is nothing to redact
// here under No-Spoilers — the toggle changes mode for the rest of the app.

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
        Control how No Noise follows games without turning sports into a feed.
      </p>

      <div className="space-y-5">
        <NoSpoilersToggle />
        <ReminderSelector />
        <QuietHoursSelector />
        <PerFollowAlerts />
        <WatchGuidanceBlock />
      </div>
    </main>
  );
}
