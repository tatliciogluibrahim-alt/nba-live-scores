"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import { deriveNBARecap, type NBARecap, type RecapBullet } from "./derive-recap";
import type { Game } from "../../nba/types";

// Quiet Recap Card. The premium in-app final-game artifact:
//
//   • Editorial Display headline naming the winner ("Knicks took it.")
//   • Big tabular score line
//   • Optional series state line ("NY leads the series 3–0.")
//   • Up to 3 "what mattered" bullets (top scorer / shooting / story)
//   • Calm card chassis — paper surface, sport accent rail, no
//     gradients, no chrome
//
// Replaces the minimal "Final." HeroMoment treatment on finals. Cross-
// sport: NBA shape lands now via `deriveNBARecap`. WC matches go
// through a parallel deriver once kickoff lands. NFL ships in Phase
// 12.
//
// Spoiler model: every spoilery cell wraps in <Spoiler>. The headline
// (which names the winner), the score numbers, the series state, and
// every bullet body marked `spoilery: true` get the blur-and-reveal
// treatment. Eyebrows and team codes stay visible because they're
// structural.

export function QuietRecapCard({
  game,
  allNBAGames = [],
  recap: precomputed,
}: {
  game: Game;
  /** Full NBA games list — enables a "Next" line when the series
   *  continues. Optional; without it the card still renders, just
   *  without next-game guidance. */
  allNBAGames?: Game[];
  /** Optional precomputed recap. When the parent already derived the
   *  shape (to branch into a fallback when null), it can pass it
   *  through to avoid recomputing. */
  recap?: NBARecap | null;
}) {
  const recap = precomputed ?? deriveNBARecap(game, allNBAGames);
  if (!recap) return null;
  return <RecapCardBody recap={recap} />;
}

function RecapCardBody({ recap }: { recap: NBARecap }) {
  const noSpoilers = useNoSpoilers();
  const subject = `${recap.awayCode} vs ${recap.homeCode}`;

  return (
    <article
      aria-label={`Recap for ${subject}`}
      className="rounded-[14px] border overflow-hidden"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
    >
      {/* ── Headline + score ─────────────────────────────────────────── */}
      <div className="px-4 pb-3 pt-4">
        <Eyebrow color="var(--nba)">Recap</Eyebrow>
        <Display
          as="h2"
          size="md"
          className="mt-1"
          style={{ letterSpacing: "-0.01em" }}
        >
          {noSpoilers && recap.headlineSpoilery ? (
            <Spoiler ariaSubject={subject}>{recap.headline}</Spoiler>
          ) : (
            recap.headline
          )}
        </Display>

        {/* Score line: AWAY · HOME chips above, big tabular score below.
            Keeps the matchup identity even when the score is blurred
            under No-Spoilers. */}
        <div className="mt-3 flex items-baseline gap-3">
          <span
            className="text-[14px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "var(--mute-1)",
            }}
          >
            {recap.awayCode} · {recap.homeCode}
          </span>
        </div>
        <p
          className="mt-1 leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          {noSpoilers ? (
            <Spoiler ariaSubject={subject}>
              {recap.awayScore} – {recap.homeScore}
            </Spoiler>
          ) : (
            <>
              {recap.awayScore} – {recap.homeScore}
            </>
          )}
        </p>

        {/* Series state — sits as inline body copy under the score,
            spoiler-wrapped under NS. Null for non-playoff games. */}
        {recap.seriesLine ? (
          <p
            className="mt-3 text-[13px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 500 }}
          >
            {noSpoilers ? (
              <Spoiler ariaSubject={subject}>{recap.seriesLine}</Spoiler>
            ) : (
              recap.seriesLine
            )}
          </p>
        ) : null}
      </div>

      {/* ── What mattered ───────────────────────────────────────────── */}
      {recap.bullets.length > 0 ? (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <Eyebrow>What mattered</Eyebrow>
          <ul className="mt-2 space-y-2.5">
            {recap.bullets.map((bullet, idx) => (
              <BulletRow
                key={`${bullet.eyebrow}-${idx}`}
                bullet={bullet}
                ariaSubject={subject}
                noSpoilers={noSpoilers}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Next ────────────────────────────────────────────────────── */}
      {recap.nextLine ? (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <Eyebrow>Next</Eyebrow>
          <p
            className="mt-1 text-[13px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            {recap.nextLine}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function BulletRow({
  bullet,
  ariaSubject,
  noSpoilers,
}: {
  bullet: RecapBullet;
  ariaSubject: string;
  noSpoilers: boolean;
}) {
  const redact = noSpoilers && bullet.spoilery;
  return (
    <li>
      <div className="flex items-baseline gap-2">
        <Eyebrow>{bullet.eyebrow}</Eyebrow>
      </div>
      <p
        className="mt-0.5 text-[14px] leading-snug"
        style={{
          color: "var(--ink)",
          fontWeight: 700,
          letterSpacing: "-0.005em",
        }}
      >
        {redact ? (
          <Spoiler ariaSubject={ariaSubject}>{bullet.body}</Spoiler>
        ) : (
          bullet.body
        )}
      </p>
    </li>
  );
}
