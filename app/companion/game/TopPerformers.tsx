"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";
import type { PlayerStatLine, TeamPerformers } from "../../nba/types";

// "Who mattered" — boxscore lite. Top 3 scorers per team, factual and
// compact. Complements HighlightsStack (which is editorial: "30-point
// night · SGA · 30 PTS, 6 AST"); this is the plain table answer to
// "who played well?" — one block per side, away team first.
//
// No-Spoilers: a player's point total leaks the outcome, so the stat
// line is Spoiler-wrapped while the NAME stays visible — fans want to
// know who showed up without seeing the score. Same contract as
// HighlightsStack.
//
// Renders nothing when there's no player data (upcoming games, or before
// ESPN populates the boxscore early in a game).

// Build the compact stat line. PTS always leads; the secondary stats
// appear only when meaningful so a quiet line stays short ("17 PTS")
// and a loud one earns its length ("28 PTS · 13 REB · 4 BLK"). Fixed
// order (PTS · REB · AST · BLK · STL) keeps every row scannable.
function statLine(p: PlayerStatLine): string {
  const parts = [`${p.pts} PTS`];
  if (p.reb > 0) parts.push(`${p.reb} REB`);
  if (p.ast > 0) parts.push(`${p.ast} AST`);
  if (p.blk >= 2) parts.push(`${p.blk} BLK`);
  if (p.stl >= 2) parts.push(`${p.stl} STL`);
  return parts.slice(0, 4).join(" · ");
}

export function TopPerformers({
  performers,
  gameId,
  awayCode,
  subject,
}: {
  performers: TeamPerformers[];
  gameId: string;
  /** Away team abbreviation — used to render the away block first so the
   *  module matches the away-first ordering used everywhere else. */
  awayCode: string;
  /** aria subject for the Spoiler wrapper, e.g. "NYK vs SA". */
  subject: string;
}) {
  const noSpoilers = useEffectiveNoSpoilers(gameId);

  if (!performers || performers.length === 0) return null;

  // Away team first, to match the away-first convention across the app.
  const ordered = [...performers].sort((a, b) =>
    a.teamAbbreviation === awayCode ? -1 : b.teamAbbreviation === awayCode ? 1 : 0
  );

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Who mattered</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div className="space-y-2">
        {ordered.map((team) => (
          <div
            key={team.teamAbbreviation}
            className="rounded-[14px] border px-3 py-2.5"
            style={{ background: "var(--paper)", borderColor: "var(--line)" }}
          >
            <Eyebrow>{team.teamAbbreviation}</Eyebrow>
            <ul className="mt-1.5 space-y-1.5">
              {team.players.map((p, i) => (
                <li
                  key={`${p.name}-${i}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span
                    className="min-w-0 truncate text-[14px]"
                    style={{
                      color: "var(--ink)",
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    className="shrink-0 text-right text-[12px] tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color: "var(--ink-2)",
                    }}
                  >
                    {noSpoilers ? (
                      <Spoiler ariaSubject={subject} gameId={gameId}>
                        {statLine(p)}
                      </Spoiler>
                    ) : (
                      statLine(p)
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
