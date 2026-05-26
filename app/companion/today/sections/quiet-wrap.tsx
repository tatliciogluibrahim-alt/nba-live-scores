"use client";

import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";
import { NoSpoilerGameCard } from "../../spoiler/NoSpoilerGameCard";
import { useNoSpoilers } from "../../providers";
import { SectionHeader } from "./section-header";
import type { QuietWrapItem } from "../today-data";

// One-line-each finals from the last 3 days. Phase 8b extended the
// window from "today + yesterday" to a rolling 3-day surface so a
// series that wrapped 2 nights ago is still browsable from Today
// rather than vanishing the moment ESPN drops it from the
// current-week feed. The eyebrow auto-formats per day ("Earlier",
// "Yesterday", "Sat", "Fri") so the list reads as a calm timeline.
//
// When No-Spoilers is on, each row swaps to a NoSpoilerGameCard with
// context-aware reveal copy.
//
// Note: the share-as-image affordance was removed in an earlier
// polish pass — the calm companion direction shouldn't lean on
// social/share CTAs. The QuietWrapShareModal component is left
// dormant in app/companion/share/ so it can be revived later without
// rebuilding from scratch.

export function QuietWrap({ items }: { items: QuietWrapItem[] }) {
  const noSpoilers = useNoSpoilers();

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
    </section>
  );
}

function QuietRowRevealed({ item }: { item: QuietWrapItem }) {
  // Quiet Wrap = yesterday's finals = *reference*, not action. We
  // deliberately strip the sport accent rail (which Up Next uses for
  // active games) and mute the matchup heading + score line so these
  // rows read calmly under Up Next without competing for attention.
  return (
    <Link
      href={item.href}
      aria-label={`${item.matchup} final — ${item.scoreLine}`}
      className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{item.eyebrow}</Eyebrow>
          <p
            className="mt-1 truncate text-[14px] leading-snug"
            style={{
              color: "var(--mute-1)",
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            {item.matchup}
          </p>
        </div>
        <span
          className="tabular-nums shrink-0 text-[14px]"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
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
