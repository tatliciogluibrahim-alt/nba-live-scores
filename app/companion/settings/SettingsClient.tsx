"use client";

import { Display } from "../atoms/Display";
import { NoSpoilersToggle } from "./NoSpoilersToggle";
import { ReminderSelector } from "./ReminderSelector";
import { QuietHoursSelector } from "./QuietHoursSelector";
import { PerFollowAlerts } from "./PerFollowAlerts";
import { WatchGuidanceBlock } from "./WatchGuidanceBlock";
import { NotificationPreview } from "./NotificationPreview";
import { PushSubscriptionPanel } from "./PushSubscriptionPanel";

// Watch + Alerts — single calm settings-style screen.
//
// No-Spoilers lives here now. It is a preference you set once, not a
// decision the app should ask you to make every time Today opens.
// The Today header shows a passive ambient dot when the mode is on —
// it does not offer a toggle.

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
        Scores, reminders, quiet hours, and per-follow alert presets.
      </p>

      <div className="space-y-5">
        <NoSpoilersToggle />
        <PushSubscriptionPanel />
        <NotificationPreview />
        <ReminderSelector />
        <QuietHoursSelector />
        <PerFollowAlerts />
        <WatchGuidanceBlock />
      </div>
    </main>
  );
}
