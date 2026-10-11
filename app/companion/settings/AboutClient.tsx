"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";

// /settings/about — calm reference page explaining the three mechanics
// that confuse most users: Follow / Watching / No-Spoilers. Linked from the
// Settings header. Optional reading; intentionally short.

export function AboutClient() {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-6">
        How this works.
      </Display>
      {/* (em-dashes intentionally avoided across this page; they read AI) */}

      <div className="space-y-5">
        <Section
          eyebrow="Follow"
          headline="Builds your sports circle."
          body="Teams, countries, series, tournaments. Follows show up on Today and Following. Alerts are set on each follow."
        />

        <Section
          eyebrow="Watching"
          headline="Keeps games in view."
          body="Add a game to Watching to keep it in one place while it's on. In the iPhone app, Track on Lock Screen puts it on your Lock Screen too. Neither sends alerts."
        />

        <Section
          eyebrow="No-Spoilers"
          headline="Hides scores everywhere."
          body="Scores and results stay hidden until you tap to reveal a game. Pushes leave the score out. Turn it on for everything in Settings, or for one follow from its row in Following."
        />

        <Section
          eyebrow="Tiers"
          headline="How loud you want it."
          body="Three levels per follow. Quiet: start, final, and the rare big moment. Companion: start, key breaks, scores, final. Full Details: every swing, including close finishes. Alerts are free on your first three follows."
        />
      </div>

      <p
        className="mt-8 text-[0.75rem] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        That&apos;s the whole product. No feed, no badges, no fantasy. If the app ever feels like it&apos;s shouting at you, something is wrong. Tell us.
      </p>

      <Link
        href="/settings"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[0.75rem] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        Back to Alerts & Notifications
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
        className="mt-2 text-[0.9375rem] leading-snug"
        style={{
          color: "var(--ink)",
          fontWeight: 700,
          letterSpacing: "-0.005em",
        }}
      >
        {headline}
      </p>
      <p
        className="mt-2 text-[0.8125rem] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {body}
      </p>
    </section>
  );
}
