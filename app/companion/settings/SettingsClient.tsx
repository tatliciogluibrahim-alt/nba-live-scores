"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { NoSpoilersToggle } from "./NoSpoilersToggle";
import { ReminderSelector } from "./ReminderSelector";
import { QuietHoursSelector } from "./QuietHoursSelector";
import { PerFollowAlerts } from "./PerFollowAlerts";
import { WatchGuidanceBlock } from "./WatchGuidanceBlock";
import { AlertTierSelector } from "./AlertTierSelector";
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
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <Display as="h1" size="lg" className="mb-1">
            Watch + Alerts.
          </Display>
          <p
            className="text-[14px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            No-Spoilers, notifications, quiet hours.
          </p>
        </div>
        {/* Optional reading for the curious user. The page explains the
            three mechanics that most often confuse new installs:
            Follow / Pin / No-Spoilers / Tiers. */}
        <Link
          href="/settings/about"
          className="shrink-0 text-[12px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          How this works
        </Link>
      </div>

      <div className="space-y-5">
        <NoSpoilersToggle />
        <PushSubscriptionPanel />
        <AlertTierSelector />
        <NotificationPreview />
        <ReminderSelector />
        <QuietHoursSelector />
        <PerFollowAlerts />
        <WatchGuidanceBlock />
      </div>
    </main>
  );
}
