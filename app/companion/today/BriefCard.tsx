"use client";

import Link from "next/link";
import type { DailyBrief } from "./daily-brief";

// BriefCard — the Daily Brief rendered as a routing surface.
//
// Stage 15D promoted the Brief from a bare <p> sentence to a real card
// with an optional CTA chip. Visual weight is deliberately calm: same
// paper background as everything else, no left rail, no display type.
// What earns its place is the CTA — when the Brief knows "the one thing
// to do," it offers a single ink-filled link to do it.
//
// When there's no CTA (No-Spoilers state, calm acknowledgements), the
// card degrades to a styled sentence. No empty pill, no ghost button.

export function BriefCard({ brief }: { brief: DailyBrief }) {
  // When the Brief has a CTA, it's *actionable* — it knows the one thing
  // for the user to do right now. We mark that with a thin sport-coded
  // left rail so the eye can distinguish "do this" briefs from "calm
  // acknowledgement" briefs (No-Spoilers state, quiet days). Color is
  // chosen by the CTA destination: WC accent when the route is a country
  // page, NBA otherwise. Calm states get no rail and keep the paper card.
  const hasCta = Boolean(brief.cta);
  const isWcRoute = brief.cta?.href.startsWith("/country") ?? false;
  const railColor = isWcRoute ? "var(--wc)" : "var(--nba)";

  return (
    <article
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: hasCta ? `3px solid ${railColor}` : `1px solid var(--line)`,
      }}
    >
      <p
        className="text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 500 }}
      >
        {brief.text}
      </p>
      {brief.cta ? (
        <Link
          href={brief.cta.href}
          aria-label={brief.cta.label}
          className="mt-2.5 inline-flex min-h-[44px] items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          {brief.cta.label}
        </Link>
      ) : null}
    </article>
  );
}
