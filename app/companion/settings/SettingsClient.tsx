"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { NoSpoilersToggle } from "./NoSpoilersToggle";
// Per-follow alert editing lives on the Following page now — every
// follow card already carries its own tier control, so the full editor
// here just duplicated it. Settings keeps a compact read-only summary
// (AlertsSummary) that links back to Following.
import { AlertsSummary } from "./AlertsSummary";
import { NoSpoilersProCard } from "./NoSpoilersProCard";
import { BriefSettingsRow } from "./BriefSettingsRow";
import { NotificationPreview } from "./NotificationPreview";
import { PushSubscriptionPanel } from "./PushSubscriptionPanel";
import { LockScreenWidgetsRow } from "./LockScreenWidgetsRow";
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
        <PushSubscriptionPanel />
        <BriefSettingsRow />
        <NotificationPreview />
        <LockScreenWidgetsRow />
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

      {/* Independence / non-affiliation notice. Scores and schedules are
          factual information; the app uses no league or federation marks,
          logos, or branding, and claims no affiliation. Keeps the IP
          position explicit for users and App Review (Guideline 5.2.1). */}
      <p
        className="mt-4 text-[11px] leading-relaxed"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        No Noise Scores is an independent app. It is not affiliated with,
        endorsed by, or sponsored by FIFA, the NBA, the NFL, or any league,
        federation, or governing body. Team and country names, schedules,
        and scores are shown as factual information.
      </p>
    </main>
  );
}
