"use client";

import Link from "next/link";
import { HeroMoment } from "../../moments/HeroMoment";
import { WatchLine } from "../../watch/WatchLine";
import { NoSpoilerGameCard } from "../../spoiler/NoSpoilerGameCard";
import { useNoSpoilers } from "../../providers";
import { SectionHeader } from "./section-header";
import type { TodayHero } from "../today-data";

// Pick a section label that matches the hero's time horizon. The
// generic "Worth checking now" read as misleading when the hero was a
// game still 8 hours away — "now" implies live action. We use the
// hero's `live` flag and `kind` to pick a label that reads true to
// what's earning the slot:
//   • Live game / WC live      → "Worth checking now"
//   • Upcoming game (any sport) → "Coming up next"
//   • WC countdown card        → "Tournament soon"
function sectionLabelForHero(hero: TodayHero): string {
  if (hero.live) return "Worth checking now";
  if (hero.kind === "wc-countdown") return "Tournament soon";
  return "Coming up next";
}

export function WorthCheckingNow({ hero }: { hero: TodayHero }) {
  const noSpoilers = useNoSpoilers();
  const sectionLabel = sectionLabelForHero(hero);

  // When No-Spoilers is on, the hero collapses to a NoSpoilerGameCard for
  // game-flavored heroes. The WC countdown hero has no score to redact, so
  // it stays as-is.
  if (noSpoilers && hero.spoilerMatchup && hero.spoilerKind) {
    return (
      <section>
        <SectionHeader label={sectionLabel} />
        <NoSpoilerGameCard
          kind={hero.spoilerKind}
          matchup={hero.spoilerMatchup}
          ariaSubject={hero.spoilerSubject}
          details={
            hero.watch ? (
              <WatchLine
                channel={hero.watch.channel}
                stream={hero.watch.stream}
                ariaSubject={hero.spoilerSubject}
              />
            ) : null
          }
        >
          {/* Revealed view: full HeroMoment without the spoiler chrome. */}
          <Link
            href={hero.href}
            aria-label={`Open ${hero.spoilerSubject ?? "live game"} detail`}
            className="block"
          >
            <HeroMoment
              eyebrow={hero.eyebrow}
              headline={hero.headline}
              context={hero.context}
              accent={hero.accent}
              live={hero.live}
              footer={
                hero.watch ? (
                  <WatchLine
                    channel={hero.watch.channel}
                    stream={hero.watch.stream}
                    ariaSubject={hero.spoilerSubject}
                  />
                ) : null
              }
            />
          </Link>
        </NoSpoilerGameCard>
      </section>
    );
  }

  // Live games earn a warm card surface — makes the live state visually
  // distinct from upcoming or final. Upcoming/final stay var(--paper).
  const liveSurface =
    hero.live
      ? hero.accent === "var(--wc)"
        ? "var(--wc-soft)"
        : "var(--nba-soft)"
      : undefined;

  return (
    <section>
      <SectionHeader label={sectionLabel} />
      <Link
        href={hero.href}
        aria-label={`Open ${hero.spoilerSubject ?? hero.headline} detail`}
        className="block"
      >
        <HeroMoment
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          context={hero.context}
          accent={hero.accent}
          live={hero.live}
          surface={liveSurface}
          footer={
            hero.watch ? (
              <WatchLine
                channel={hero.watch.channel}
                stream={hero.watch.stream}
                ariaSubject={hero.spoilerSubject}
              />
            ) : null
          }
        />
      </Link>
    </section>
  );
}
