"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill } from "../atoms/StatusPill";
import { Spoiler } from "../spoiler/Spoiler";
import { GameSpoilerScope, useReveal } from "../spoiler/reveal";
import type { SeriesGameRow } from "./series-data";

// Compact list of all games in the series. Each row links into the
// existing /game/[id] detail screen. Score numerals wrap in <Spoiler>;
// upcoming rows render no score.

export function RelatedGames({
  games,
  hidden,
}: {
  games: SeriesGameRow[];
  hidden: boolean;
}) {
  const { isRevealed } = useReveal();
  if (games.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Games in this series</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <ul className="space-y-2">
        {games.map((row) => {
          const tone =
            row.status === "live"
              ? "live"
              : row.status === "upcoming"
                ? "upcoming"
                : "final";
          const subject = `${row.awayCode} vs ${row.homeCode}`;
          const resultHidden = hidden && !isRevealed(row.id);
          return (
            <GameSpoilerScope key={row.id} gameId={row.id} hidden={hidden}>
              <li
                className="relative flex min-h-[56px] items-center gap-3 rounded-[14px] border px-3 py-2"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                }}
              >
                <Link
                  href={row.href}
                  aria-label={`Open ${row.label} detail`}
                  className="absolute inset-0 rounded-[14px] transition active:scale-[0.99]"
                />
                  <div className="pointer-events-none min-w-0 flex-1">
                    <Eyebrow>{row.label}</Eyebrow>
                    <p
                      className="mt-1 text-[14px] leading-snug"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 700,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {row.awayCode} · {row.homeCode}
                    </p>
                  </div>

                  {row.scoreLine ? (
                    <span
                      className="shrink-0 text-[14px]"
                      style={{
                        color: "var(--ink)",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        ...(resultHidden
                          ? { position: "relative", zIndex: 1 }
                          : {}),
                      }}
                    >
                      <Spoiler ariaSubject={subject} gameId={row.id}>
                        {row.scoreLine}
                      </Spoiler>
                    </span>
                  ) : (
                    <StatusPill tone={tone}>
                      {tone === "upcoming"
                        ? "Upcoming"
                        : tone === "live"
                          ? "Live"
                          : "Final"}
                    </StatusPill>
                  )}
              </li>
            </GameSpoilerScope>
          );
        })}
      </ul>
    </section>
  );
}
