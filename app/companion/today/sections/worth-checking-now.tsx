"use client";

import Link from "next/link";
import { HeroMoment } from "../../moments/HeroMoment";
import { WatchLine } from "../../watch/WatchLine";
import { NoSpoilerGameCard } from "../../spoiler/NoSpoilerGameCard";
import { useNoSpoilers } from "../../providers";
import { SectionHeader } from "./section-header";
import type { TodayHero } from "../today-data";

export function WorthCheckingNow({ hero }: { hero: TodayHero }) {
  const noSpoilers = useNoSpoilers();

  // When No-Spoilers is on, the hero collapses to a NoSpoilerGameCard for
  // game-flavored heroes. The WC countdown hero has no score to redact, so
  // it stays as-is.
  if (noSpoilers && hero.spoilerMatchup && hero.spoilerKind) {
    return (
      <section>
        <SectionHeader label="Worth checking now" />
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

  return (
    <section>
      <SectionHeader label="Worth checking now" />
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
