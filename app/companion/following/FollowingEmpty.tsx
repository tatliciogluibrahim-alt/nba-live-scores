import Link from "next/link";
import { Display } from "../atoms/Display";
import { FOLLOW_CHOICES, FollowChoice } from "./FollowChoice";

// Following — empty / onboarding. One editorial headline + four nouns +
// a persistent Watch + Alerts link. That last bit is critical: a fresh
// install with zero follows still needs a path to turn on notifications,
// quiet hours, No-Spoilers, etc.

export function FollowingEmpty() {
  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Tell us who you follow.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        These drive your notifications. Only their games surface here. Everything else stays quiet.
      </p>

      <div className="space-y-2">
        {FOLLOW_CHOICES.map((c) => (
          <FollowChoice
            key={c.href}
            eyebrow={c.eyebrow}
            title={c.title}
            detail={c.detail}
            href={c.href}
          />
        ))}
      </div>

      {/* Watch + Alerts shortcut. Always reachable from Following, even
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
        aria-label="Open Watch + Alerts"
      >
        <span className="text-[13px]" style={{ fontWeight: 600 }}>
          Watch + Alerts
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
