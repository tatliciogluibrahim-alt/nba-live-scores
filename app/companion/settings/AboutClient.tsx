"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";

// /settings/about — calm reference page explaining the three mechanics
// that confuse most users: Follow / Pin / No-Spoilers. Linked from the
// Settings header. Optional reading; intentionally short.

export function AboutClient() {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-2">
        How this works.
      </Display>
      <p
        className="mb-6 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Three mechanics. Pin a game, follow a team, choose what wakes you up.
      </p>
      {/* (em-dashes intentionally avoided across this page; they read AI) */}

      <div className="space-y-5">
        <Section
          eyebrow="Follow"
          headline="Drives your notifications."
          body="Teams, countries, series, tournaments. Game events for the things you follow show up as pushes on your phone. Tipoffs, end of quarters, finals. Set up follows on the Following tab."
        />

        <Section
          eyebrow="Pin"
          headline="Tracks games during play."
          body="Pin a game to keep it on your Watching tab during the action. Pinning does not subscribe you to notifications. Only follows do. Use it for tracking key moments, not for alerts."
        />

        <Section
          eyebrow="No-Spoilers"
          headline="Hides scores across every surface."
          body="When on, scores and series outcomes are blurred until you tap to reveal them. Notifications stay calm. No score in the body, no closeness signals. Toggle it in Watch + Alerts."
        />

        <Section
          eyebrow="Tiers"
          headline="How loud you want it."
          body="Three levels: Quiet (game start and final only), Companion (plus the period breaks, the default), or All moments (plus close finishes and comebacks). The same tier applies across every sport. Pick once when you turn notifications on. Change anytime in Watch + Alerts."
        />
      </div>

      <p
        className="mt-8 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        That&apos;s the whole product. No feed, no badges, no fantasy. If the app ever feels like it&apos;s shouting at you, something is wrong. Tell us.
      </p>

      <Link
        href="/settings"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        Back to Watch + Alerts
      </Link>
    </main>
  );
}

function Section({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section
      className="rounded-[14px] border px-4 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <p
        className="mt-2 text-[15px] leading-snug"
        style={{
          color: "var(--ink)",
          fontWeight: 700,
          letterSpacing: "-0.005em",
        }}
      >
        {headline}
      </p>
      <p
        className="mt-2 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {body}
      </p>
    </section>
  );
}
