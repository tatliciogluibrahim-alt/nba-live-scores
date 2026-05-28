"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { buildAllGroups, type GroupBlock } from "../country/country-data";
import type { GroupRow } from "../country/country-data";
import type { WCGameLite } from "../today/today-data";

// World Cup groups view — editorial, flag-free, matching the country
// GroupStrip. Two modes:
//
//   • "preview" (tournament page): your followed group first (when you
//     follow one), then one row of other groups, then "View all groups".
//     Keeps the tournament page calm instead of stacking all 12.
//   • "full" (/tournament/[id]/groups): every group in a two-column grid.
//
// Standings (GP · PTS) appear under a name once that group has played a
// game; pre-tournament it's just names + codes. Rows link to the
// country page carrying ?from=<tournament-id> so the back-crumb resolves
// to the tournament.

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

function useWCGroups(selectedCode?: string): {
  groups: GroupBlock[];
  hydrated: boolean;
} {
  const [games, setGames] = useState<WCGameLite[]>([]);
  const gamesRef = useRef<WCGameLite[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchWC();
      if (isCancelled()) return;
      gamesRef.current = next;
      setGames(next);
      setHydrated(true);
    },
    () =>
      gamesRef.current.some((g) => g.status === "live")
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS
  );

  const groups = useMemo(
    () => buildAllGroups(games, selectedCode),
    [games, selectedCode]
  );

  return { groups, hydrated };
}

function CountryRow({
  row,
  tournamentId,
  isLast,
}: {
  row: GroupRow;
  tournamentId: string;
  isLast: boolean;
}) {
  const nameColor = row.isSelected ? "var(--wc)" : "var(--ink)";
  const codeColor = row.isSelected ? "var(--wc)" : "var(--mute-1)";
  const standing = row.standing;

  return (
    <Link
      href={`/country/${row.code}?from=${tournamentId}`}
      aria-label={`Open ${row.name}`}
      className="flex items-center justify-between gap-2 py-2 transition active:scale-[0.99]"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}
    >
      <div className="min-w-0">
        <div
          className="truncate text-[14px] leading-tight"
          style={{
            color: nameColor,
            fontWeight: row.isSelected ? 700 : 600,
            letterSpacing: "-0.005em",
          }}
        >
          {row.name}
        </div>
        {standing && standing.played > 0 ? (
          <div
            className="mt-0.5 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              color: "var(--mute-1)",
              fontWeight: 600,
            }}
          >
            {standing.played} GP · {standing.points} PTS
          </div>
        ) : null}
      </div>
      <span
        className="shrink-0 text-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.06em",
          color: codeColor,
          fontWeight: 700,
        }}
      >
        {row.code}
      </span>
    </Link>
  );
}

function GroupColumn({
  block,
  tournamentId,
}: {
  block: GroupBlock;
  tournamentId: string;
}) {
  const hasSelected = block.rows.some((r) => r.isSelected);
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Eyebrow color={hasSelected ? "var(--wc)" : undefined}>
          Group {block.letter}
        </Eyebrow>
      </div>
      <div>
        {block.rows.map((row, idx) => (
          <CountryRow
            key={row.code}
            row={row}
            tournamentId={tournamentId}
            isLast={idx === block.rows.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function GroupsHeader({ count }: { count: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <Eyebrow>Groups</Eyebrow>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      <span
        className="text-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          color: "var(--mute-2)",
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </div>
  );
}

export function WCGroups({
  tournamentId,
  mode,
}: {
  tournamentId: string;
  mode: "preview" | "full";
}) {
  const { follows } = useFollows();
  const followedCountry = follows.find((f) => f.kind === "country")?.id;
  const { groups, hydrated } = useWCGroups(followedCountry);

  if (!hydrated) {
    return (
      <section className="mt-5" aria-busy aria-live="polite">
        <div
          className="h-[160px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
      </section>
    );
  }

  if (mode === "full") {
    return (
      <section className="mt-5">
        <GroupsHeader count={`${groups.length} in total · A–L`} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 md:gap-x-8">
          {groups.map((block) => (
            <GroupColumn
              key={block.letter}
              block={block}
              tournamentId={tournamentId}
            />
          ))}
        </div>
      </section>
    );
  }

  // Preview mode. Lead with the followed group (when present), then show
  // one row (two columns) of the next groups, then a "View all" link.
  const followedBlock = followedCountry
    ? groups.find((g) => g.rows.some((r) => r.isSelected)) ?? null
    : null;

  const others = groups.filter((g) => g !== followedBlock);
  const previewOthers = others.slice(0, 2);

  return (
    <section className="mt-5">
      <GroupsHeader count={`${groups.length} in total`} />

      {followedBlock ? (
        <div className="mb-5">
          <GroupColumn block={followedBlock} tournamentId={tournamentId} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {previewOthers.map((block) => (
          <GroupColumn
            key={block.letter}
            block={block}
            tournamentId={tournamentId}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href={`/tournament/${tournamentId}/groups`}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-[12px] underline decoration-dotted underline-offset-4"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
          aria-label="View all 12 World Cup groups"
        >
          View all {groups.length} groups →
        </Link>
      </div>
    </section>
  );
}
