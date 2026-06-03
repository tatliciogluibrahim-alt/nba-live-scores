import Link from "next/link";
import { Display } from "../atoms/Display";

// Calm empty state. Pin language is deliberate (vs "watch") so users
// understand this isn't a TV destination. Title kept short + standard;
// body explains the verb without trying to sell the room.

export function WatchingEmpty() {
  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Your live games.
      </Display>
      {/* Empty-state direction. Mirrors the muted secondary text used
          elsewhere (Today's "Tell us who you follow" sub, Settings
          row helpers). Tells the user where to act without nagging. */}
      <p
        className="mb-5 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pin a game from Following to track it here.
      </p>

      <div className="space-y-2">
        <Link
          href="/"
          className="flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--ink)",
          }}
          aria-label="Go to Today"
        >
          <span className="text-[13px]" style={{ fontWeight: 700 }}>
            See what&apos;s on Today
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Worth checking now
          </span>
        </Link>

        <Link
          href="/following"
          className="flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--ink)",
          }}
          aria-label="Go to Following"
        >
          <span className="text-[13px]" style={{ fontWeight: 700 }}>
            Set up Following
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Teams, countries, series, tournaments
          </span>
        </Link>
      </div>
    </section>
  );
}
