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
// Per-follow alert editing lives on the Following page now — every
// follow card already carries its own tier control, so the full editor
// here just duplicated it. Settings keeps a compact read-only summary
// (AlertsSummary) that links back to Following.
import { AlertsSummary } from "./AlertsSummary";
import { NoSpoilersProCard } from "./NoSpoilersProCard";
import { BriefSettingsRow } from "./BriefSettingsRow";
import { NotificationPreview } from "./NotificationPreview";
import { PushSubscriptionPanel } from "./PushSubscriptionPanel";
import { ThemeSelector } from "./ThemeSelector";

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

      {/* Ordering: preferences first (No-Spoilers global mode, then the
          follow-alerts summary), then the delivery channels (push on this
          device, daily Brief), then appearance, then the coming-later
          teaser. "What alerts look like" is reference material, collapsed
          behind a + so it doesn't dominate the scroll. */}
      <div className="space-y-5">
        <NoSpoilersToggle />
        <AlertsSummary />
        {/* <ReminderSelector />  Hidden until the pre-game reminder
            cron ships. */}
        {/* <QuietHoursSelector />  Hidden until the dispatcher honors
            quietHours per subscription. */}
        <PushSubscriptionPanel />
        <BriefSettingsRow />
        <NotificationPreview />
        <ThemeSelector />
        {/* No-Spoilers Pro teaser sits at the bottom — it's a "coming
            later" note, not an action, so it doesn't compete with the
            live controls above. */}
        <NoSpoilersProCard />
      </div>

      {/* Privacy + contact. Reachable in-app (required for App Review,
          and just good manners). The native wrapper loads the live site,
          so these resolve to the real pages / mail client. */}
      <footer
        className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-[12px]"
        style={{ borderColor: "var(--line)", color: "var(--mute-1)", fontWeight: 500 }}
      >
        <Link
          href="/privacy"
          className="underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)" }}
        >
          Privacy
        </Link>
        <a
          href="mailto:nonoisescores@gmail.com"
          className="underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)" }}
        >
          nonoisescores@gmail.com
        </a>
        <a
          href="https://instagram.com/nonoisescores"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)" }}
        >
          @nonoisescores
        </a>
      </footer>
    </main>
  );
}
