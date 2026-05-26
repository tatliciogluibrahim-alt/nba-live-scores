import Link from "next/link";
import { Display } from "../atoms/Display";
import { FOLLOW_MOMENTS } from "./FollowChoice";
import { MomentSection } from "./MomentSection";

// Following — empty / onboarding. Moment-grouped picker (NBA Playoffs,
// FIFA WC 2026) with the granularity ladder inside each section, plus
// a persistent Alerts & Notifications link. The Alerts & Notifications shortcut stays
// because a fresh install with zero follows still needs a path to
// turn on notifications, quiet hours, No-Spoilers, etc.

export function FollowingEmpty() {
  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Build your sports circle.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pick a moment, then who in it. Only what you follow surfaces in
        this app — everything else stays quiet.
      </p>

      <div className="space-y-3">
        {FOLLOW_MOMENTS.map((moment) => (
          <MomentSection key={moment.id} moment={moment} />
        ))}
      </div>

      {/* Alerts & Notifications shortcut. Always reachable from Following, even
          before the user has anything to follow — that's where push gets
          enabled. */}
      <Link
        href="/settings"
        className="mt-5 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
        style={{
          background: "transparent",
          borderColor: "var(--mute-2)",
          color: "var(--ink)",
        }}
        aria-label="Open Alerts & Notifications"
      >
        <span className="text-[13px]" style={{ fontWeight: 600 }}>
          Alerts & Notifications
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Notifications · No-Spoilers · Quiet hours
        </span>
      </Link>
    </section>
  );
}
