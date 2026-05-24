"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";
import { NoSpoilerGameCard } from "../../spoiler/NoSpoilerGameCard";
import { useNoSpoilers } from "../../providers";
import { QuietWrapShareModal } from "../../share/QuietWrapShareModal";
import { SectionHeader } from "./section-header";
import type { QuietWrapItem } from "../today-data";

// One-line-each finals from yesterday / earlier. Replaces the old "Final"
// section. When No-Spoilers is on, each row swaps to a NoSpoilerGameCard
// with context-aware reveal copy.
//
// A "Share quiet wrap" link appears at the bottom when No-Spoilers is OFF
// and at least one final exists — opens a 720×720 share-card modal that
// users can save as a calm screenshot artifact (growth loop).

export function QuietWrap({ items }: { items: QuietWrapItem[] }) {
  const noSpoilers = useNoSpoilers();
  const [shareOpen, setShareOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader label="Quiet wrap" />
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {noSpoilers ? (
              <NoSpoilerGameCard
                kind={item.kind}
                matchup={item.matchup}
                ariaSubject={item.spoilerSubject}
              >
                <QuietRowRevealed item={item} />
              </NoSpoilerGameCard>
            ) : (
              <QuietRowRevealed item={item} />
            )}
          </li>
        ))}
      </ul>

      {/* Share trigger — only when results are visible (i.e. No-Spoilers
          is off). Under No-Spoilers we hide the trigger entirely because
          the artifact would either leak the user's results or be empty. */}
      {!noSpoilers && items.length > 0 ? (
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share your Quiet Wrap as an image"
          className="mt-3 text-[11px] uppercase"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          Share quiet wrap →
        </button>
      ) : null}

      {shareOpen ? (
        <QuietWrapShareModal items={items} onClose={() => setShareOpen(false)} />
      ) : null}
    </section>
  );
}

function QuietRowRevealed({ item }: { item: QuietWrapItem }) {
  return (
    <Link
      href={item.href}
      aria-label={`${item.matchup} final — ${item.scoreLine}`}
      className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{item.eyebrow}</Eyebrow>
          <p
            className="mt-1 truncate text-[14px] leading-snug"
            style={{
              color: "var(--ink)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {item.matchup}
          </p>
        </div>
        <span
          className="tabular-nums shrink-0 text-[15px]"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.scoreLine}
        </span>
      </div>
      {item.context ? (
        <p
          className="mt-1 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {item.context}
        </p>
      ) : null}
    </Link>
  );
}
