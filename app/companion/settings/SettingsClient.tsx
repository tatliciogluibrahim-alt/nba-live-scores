"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { NoSpoilersToggle } from "./NoSpoilersToggle";
// ReminderSelector + QuietHoursSelector are intentionally NOT mounted
// yet. Both UIs exist and write to localStorage, but the server side
// that would honor them isn't built:
//
//   - ReminderSelector → needs `/api/cron/pre-game-reminders` cron
//     that scans upcoming games and fires reminders N minutes before
//     tipoff per the user's `remindBeforeMinutes`.
//   - QuietHoursSelector → needs the dispatcher to read `quietHours`
//     on each subscription and skip delivery during the configured
//     window.
//
// Shipping either picker now leaves a non-functional setting in the
// app, which leaks trust. Re-import + remount each when its server-
// side path lands.
//
// import { ReminderSelector } from "./ReminderSelector";
// import { QuietHoursSelector } from "./QuietHoursSelector";
import { PerFollowAlerts } from "./PerFollowAlerts";
import { NoSpoilersProCard } from "./NoSpoilersProCard";
import { BriefSettingsRow } from "./BriefSettingsRow";
import { WatchGuidanceBlock } from "./WatchGuidanceBlock";
import { NotificationPreview } from "./NotificationPreview";
import { PushSubscriptionPanel } from "./PushSubscriptionPanel";
import { ThemeSelector } from "./ThemeSelector";
import { LiveActivityTester } from "./LiveActivityTester";
import { WCPreviewToggle } from "./WCPreviewToggle";

// Alerts & Notifications — single calm settings-style screen.
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
            Alerts & Notifications.
          </Display>
          <p
            className="text-[14px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            No-Spoilers, notifications, theme.
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

      {/* Per-follow alerts is the heart of this screen — push test
          controls live below so they don't visually overpower the
          alert-tier picker. No-Spoilers stays on top as a global mode. */}
      <div className="space-y-5">
        <NoSpoilersToggle />
        <PerFollowAlerts />
        {/* No-Spoilers Pro pitch sits right under the per-follow alert
            controls — that's where the free 3-slot cap is felt, so the
            "unlock unlimited" framing lands in context. */}
        <NoSpoilersProCard />
        {/* <ReminderSelector />  Hidden until the pre-game reminder
            cron ships. */}
        {/* <QuietHoursSelector />  Hidden until the dispatcher honors
            quietHours per subscription. */}
        <BriefSettingsRow />
        <ThemeSelector />
        <PushSubscriptionPanel />
        <NotificationPreview />
        {/* DEV-ONLY: remove before App Store ship (Phase 22.5-5). */}
        <LiveActivityTester />
        <WCPreviewToggle />
        <WatchGuidanceBlock />
      </div>
    </main>
  );
}
