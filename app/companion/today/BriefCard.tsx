"use client";

import Link from "next/link";
import type { DailyBrief } from "./daily-brief";

// Front Page headline (Concept A). The Daily Brief — the one calm
// sentence summarizing today — is promoted from a small card to the
// editorial LEAD of the screen: "one headline a day." It sits directly
// on the cream (no card chrome), in display type, sized down for longer
// copy so it never overflows.
//
// Conservative copy by design: this reuses the existing, already-tuned
// brief text and CTA from deriveDailyBrief. We changed the presentation
// (small sentence → big headline), not the words.
//
// When the brief knows the one thing to do, a quiet accent link sits
// beneath it — editorial, not a loud filled button. Calm/No-Spoilers
// states render headline-only.

// Length-based sizing keeps the drama for short "calm" briefs while
// staying safe for the longer multi-pin / mixed-state sentences.
function headlineSize(len: number): number {
  if (len <= 22) return 40;
  if (len <= 40) return 32;
  return 26;
}

export function BriefCard({ brief }: { brief: DailyBrief }) {
  const isWcRoute = brief.cta?.href.startsWith("/country") ?? false;
  const accent = isWcRoute ? "var(--wc)" : "var(--nba)";
  const size = headlineSize(brief.text.length);

  return (
    <section className="mb-5">
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textWrap: "pretty",
        }}
      >
        {brief.text}
      </h2>
      {brief.cta ? (
        <Link
          href={brief.cta.href}
          aria-label={brief.cta.label}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{ color: accent }}
        >
          {brief.cta.label}
          <span aria-hidden>→</span>
        </Link>
      ) : null}
    </section>
  );
}
