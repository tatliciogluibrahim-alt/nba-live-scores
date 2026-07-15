"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Spoiler } from "../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { SecHead } from "../system/SecHead";
import { useFollows, useNoSpoilers } from "../providers";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { buildGroupTable, type GroupTableRow } from "./group-table";
import {
  buildAllGroupsFromSchedule,
  type GroupDetail,
  type GroupScheduleRow,
  type WCScheduleFixtureLite,
  type WCScheduleStandingLite,
} from "../country/country-data";
import { WC_GROUP_FIXTURES } from "../following/data/wc-fixtures";
import { getCountry } from "../following/data/countries";
import type { WCChampion } from "../../lib/wc-champion";
import {
  withGameOrigin,
  type GameOrigin,
} from "../game/game-origin";

// Curated group fixtures adapted to the schedule shape, so the page can
// SERVER-RENDER the real 12 groups + teams (status "upcoming", no scores)
// instead of a skeleton. The client then upgrades to the live schedule +
// official standings on hydration. This is what makes the body crawlable
// for "world cup 2026 groups" — the empty client shell saw nothing before.
const CURATED_FIXTURES: WCScheduleFixtureLite[] = WC_GROUP_FIXTURES.map((f) => ({
  id: f.id,
  date: f.kickoff,
  status: "upcoming" as const,
  statusText: "",
  stage: `Group ${f.group}`,
  group: f.group,
  home: { name: getCountry(f.home)?.name ?? f.home, abbreviation: f.home, score: 0 },
  away: { name: getCountry(f.away)?.name ?? f.away, abbreviation: f.away, score: 0 },
  broadcasts: [],
}));

// Summer Soccer groups view — editorial, flag-free, matching the country
// GroupStrip. Two modes:
//
//   • "preview" (tournament page): your followed group first (when you
//     follow one), then one row of other groups, then "View all groups".
//     Keeps the tournament page calm instead of stacking all 12.
//   • "full" (/tournament/[id]/groups): every group as a stacked card —
//     teams, the official standings line, and an expandable schedule.
//
// Data comes from /api/world-cup/schedule: the COMPLETE tournament from
// ESPN (real pairings, dates, scores) plus the OFFICIAL standings. No
// rolling-window gaps, so nothing is fabricated and standings are real.
// Rows link to the country page carrying ?from=<tournament-id>:groups so
// the back-crumb resolves to this full-groups page, not the condensed one.

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

type SchedulePayload = {
  fixtures: WCScheduleFixtureLite[];
  standings: Record<string, WCScheduleStandingLite[]>;
  champion: WCChampion | null;
};

async function fetchSchedule(): Promise<SchedulePayload> {
  try {
    const res = await fetch("/api/world-cup/schedule", { cache: "no-store" });
    if (!res.ok) return { fixtures: [], standings: {}, champion: null };
    const json = (await res.json()) as Partial<SchedulePayload>;
    return {
      fixtures: json.fixtures ?? [],
      standings: json.standings ?? {},
      champion: json.champion ?? null,
    };
  } catch {
    return { fixtures: [], standings: {}, champion: null };
  }
}

export function useWCSchedule(): {
  fixtures: WCScheduleFixtureLite[];
  standings: Record<string, WCScheduleStandingLite[]>;
  champion: WCChampion | null;
  hydrated: boolean;
} {
  const [data, setData] = useState<SchedulePayload>({
    fixtures: [],
    standings: {},
    champion: null,
  });
  const dataRef = useRef<SchedulePayload>(data);
  const [hydrated, setHydrated] = useState(false);

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchSchedule();
      if (isCancelled()) return;
      dataRef.current = next;
      setData(next);
      setHydrated(true);
    },
    () =>
      dataRef.current.fixtures.some((f) => f.status === "live")
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS
  );

  return {
    fixtures: data.fixtures,
    standings: data.standings,
    champion: data.champion,
    hydrated,
  };
}

// ── Full mode (groups page) — stacked schedule-first cards ─────────────


// Right-aligned state word. Calm, user-facing — no admin "RESULT PENDING".
// Carries the live minute ("Live · 67'") but never a score (safe under
// No-Spoilers; only the numbers in the matchup line are gated).
function statusWord(match: GroupScheduleRow): string {
  if (match.status === "final") return "Full time";
  if (match.status === "live") {
    const t = match.statusText.trim();
    return t && t.toLowerCase() !== "live" ? `Live · ${t}` : "Live";
  }
  // Played, but the rolling window doesn't carry the result yet.
  if (match.awaitingResult) return "Awaiting result";
  return ""; // upcoming — the date/time line carries it on the left
}

function ScheduleRow({
  match,
  gameOrigin,
  gameReturnTo,
}: {
  match: GroupScheduleRow;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const live = match.status === "live";
  const played = match.status === "live" || match.status === "final";
  const hasScore = match.awayScore != null && match.homeScore != null;
  const state = statusWord(match);
  const scopeId = match.id || `wc-group-${match.matchday}-${match.awayCode}-${match.homeCode}`;
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [match.awayCode, match.homeCode],
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(scopeId);

  const inner = (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        {played && hasScore ? (
          // "BIH 0 · 0 SUI" — canonical away-then-home order. Only the
          // numbers are Spoiler-gated; the matchup stays readable.
          <p
            className="truncate text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 700 }}
          >
            {match.awayCode}{" "}
            <span
              style={
                resultHidden ? { position: "relative", zIndex: 1 } : undefined
              }
            >
              <Spoiler
                gameId={scopeId}
                ariaSubject={`${match.awayCode} versus ${match.homeCode}`}
              >
                {match.awayScore} · {match.homeScore}
              </Spoiler>
            </span>{" "}
            {match.homeCode}
          </p>
        ) : (
          <p
            className="truncate text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            {match.awayCode} vs {match.homeCode}
          </p>
        )}
        {!played ? (
          <p
            className="mt-0.5 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              color: "var(--mute-2)",
              fontWeight: 600,
            }}
          >
            {match.dateLabel} · {match.timeLabel}
          </p>
        ) : null}
      </div>
      {state ? (
        <span
          className="shrink-0 text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            color: live ? "var(--live)" : "var(--mute-1)",
            fontWeight: 700,
          }}
        >
          {state}
        </span>
      ) : null}
    </div>
  );
  // Static-only rows (no feed id yet) aren't deep-linkable; render plain.
  const row = match.href ? (
    <div className="relative block transition active:scale-[0.99]">
      <Link
        href={withGameOrigin(match.href, gameOrigin, gameReturnTo)}
        aria-label={`Open ${match.awayCode} versus ${match.homeCode}`}
        className="absolute inset-0"
      />
      {inner}
    </div>
  ) : (
    <div>{inner}</div>
  );

  return (
    <GameSpoilerScope gameId={scopeId} hidden={hidden}>
      {row}
    </GameSpoilerScope>
  );
}

function ScheduleList({
  schedule,
  gameOrigin,
  gameReturnTo,
}: {
  schedule: GroupScheduleRow[];
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  // Group by matchday so the six rows read as the round-robin they are.
  const byDay = new Map<number, GroupScheduleRow[]>();
  for (const m of schedule) {
    const arr = byDay.get(m.matchday) ?? [];
    arr.push(m);
    byDay.set(m.matchday, arr);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <div className="mt-2 space-y-2.5">
      {days.map((day) => (
        <div key={day}>
          {day > 0 ? (
            <p
              className="mb-0.5 text-[9px] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                color: "var(--mute-2)",
                fontWeight: 700,
              }}
            >
              Matchday {day}
            </p>
          ) : null}
          {(byDay.get(day) ?? []).map((m) => (
            <ScheduleRow
              key={`${m.id}-${m.awayCode}`}
              match={m}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function nextLine(block: GroupDetail): string {
  if (block.phase === "complete") return "All matches played";
  if (block.next) {
    return `Next · ${block.next.awayCode} vs ${block.next.homeCode} · ${block.next.timeLabel}`;
  }
  return "Schedule";
}

// ── System D mobile tables (D3 Task 5) ─────────────────────────────────
// The cut-line standings table from d-tournament: mono column heads, a pos
// numeral, the followed country in full ink, right-aligned tabular numerics,
// and a 2px dashed rule after the 2nd row (the qualification cut). The
// footnote runs ONCE per page (under the first table) and tells the honest
// WC-2026 rule: top 2 qualify AND the 8 best third-placed teams join, so 3rd
// is never marked out. No "advancing" dots (§5 accent law — the dashed rule
// alone carries the story; the pulse means live, exclusively).

const GROUP_GRID = "22px 1fr 40px 40px 44px";

const CUT_NOTE = "– – QUALIFICATION LINE · TOP 2 GO THROUGH · 8 BEST 3RDS JOIN";

const NUM_CELL = {
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  color: "var(--mute-1)",
} as const;

function GroupTableHead() {
  return (
    <div
      className="grid items-center uppercase"
      style={{
        gridTemplateColumns: GROUP_GRID,
        gap: 8,
        padding: "10px 0 8px",
        borderBottom: "1px solid var(--line)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.16em",
        fontWeight: 600,
        color: "var(--mute-2)",
      }}
    >
      <span aria-hidden />
      <span>Team</span>
      <span className="text-right">Pld</span>
      <span className="text-right">GD</span>
      <span className="text-right">Pts</span>
    </div>
  );
}

function GroupTableRowView({
  row,
  cut,
  href,
}: {
  row: GroupTableRow;
  cut: boolean;
  href?: string;
}) {
  // Cut row (2nd place) carries the 2px dashed qualification line in place of
  // the 1px hairline; every other row keeps the hairline (matches the mock).
  const rowStyle = {
    gridTemplateColumns: GROUP_GRID,
    gap: 8,
    padding: "12px 0",
    borderBottom: cut ? "2px dashed var(--mute-2)" : "1px solid var(--line)",
    fontSize: 14,
  } as const;

  const inner = (
    <>
      <span
        className="tabular-nums lining-nums"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--mute-2)" }}
      >
        {row.pos}
      </span>
      <span
        className="min-w-0 truncate"
        style={{ color: "var(--ink)", fontWeight: row.followed ? 800 : 600, letterSpacing: "-0.005em" }}
      >
        {row.name}
      </span>
      <span className="text-right tabular-nums lining-nums" style={NUM_CELL}>
        {row.pld}
      </span>
      <span className="text-right tabular-nums lining-nums" style={NUM_CELL}>
        {row.gd}
      </span>
      <span
        className="text-right tabular-nums lining-nums"
        style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 15, color: "var(--ink)" }}
      >
        {row.pts}
      </span>
    </>
  );

  // Tappable to the country page (the "tap a country" page promise + the
  // legacy desktop behaviour). A standings table is a cohesive unit, so the
  // pressed state carries the affordance without a per-row → in the grid.
  if (href) {
    return (
      <Link
        href={href}
        aria-label={`Open ${row.name}`}
        className="grid items-center transition active:bg-[var(--paper)]"
        style={rowStyle}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="grid items-center" style={rowStyle}>
      {inner}
    </div>
  );
}

function GroupCutNote() {
  return (
    <p
      style={{
        marginTop: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        color: "var(--mute-2)",
        fontWeight: 600,
      }}
    >
      {CUT_NOTE}
    </p>
  );
}

// One group as an unboxed System D cut-line table. `withSchedule` mounts the
// expandable matches toggle (full mode only; preview stays a glance). The
// footnote is caller-gated so it renders once per page.
function GroupTableSection({
  block,
  fromParam,
  showFootnote,
  withSchedule,
  topClass,
  gameOrigin,
  gameReturnTo,
}: {
  block: GroupDetail;
  fromParam: string;
  showFootnote: boolean;
  withSchedule: boolean;
  topClass: string;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const table = buildGroupTable(block);
  const codeByName = new Map(block.rows.map((r) => [r.name, r.code]));
  const maxPlayed = block.rows.reduce(
    (m, r) => Math.max(m, r.standing?.played ?? 0),
    0
  );
  const count =
    maxPlayed > 0 ? `AFTER MATCHDAY ${Math.min(3, maxPlayed)}` : "UPCOMING";

  return (
    <section className={topClass}>
      <SecHead name={`Group ${block.letter}`} count={count} />
      <GroupTableHead />
      {table.rows.map((r, idx) => (
        <GroupTableRowView
          key={r.name}
          row={r}
          cut={idx + 1 === table.cutAfter}
          href={`/country/${codeByName.get(r.name) ?? ""}?from=${fromParam}`}
        />
      ))}
      {showFootnote ? <GroupCutNote /> : null}

      {withSchedule ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} Group ${block.letter} matches`}
            className="mt-[12px] flex min-h-[36px] w-full items-center justify-between gap-3 text-left transition active:opacity-70"
          >
            <span
              className="min-w-0 truncate text-[12px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {nextLine(block)}
            </span>
            <span
              className="shrink-0 uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {open ? "Matches ↑" : "Matches ↓"}
            </span>
          </button>
          {open ? (
            <ScheduleList
              schedule={block.schedule}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function WCGroups({
  tournamentId,
  mode,
  gameOrigin,
  gameReturnTo,
}: {
  tournamentId: string;
  mode: "preview" | "full";
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const { follows } = useFollows();
  const followedCountry = follows.find((f) => f.kind === "country")?.id;
  const { fixtures, standings, hydrated } = useWCSchedule();

  // Build from the live schedule once it's in; until then (SSR + first paint,
  // or a failed fetch) build from the curated fixtures so the real groups +
  // teams render server-side rather than a skeleton.
  const useLive = hydrated && fixtures.length > 0;
  const groups = useMemo(
    () =>
      buildAllGroupsFromSchedule(
        useLive ? fixtures : CURATED_FIXTURES,
        useLive ? standings : {},
        followedCountry
      ),
    [useLive, fixtures, standings, followedCountry]
  );

  // `fromParam` encodes BOTH the tournament id and which view the user is
  // leaving from. Country detail's resolveBackTarget parses the `:groups`
  // suffix and routes back to this full-groups page instead of the
  // condensed tournament page.
  const fromParam = mode === "full" ? `${tournamentId}:groups` : tournamentId;

  if (mode === "full") {
    return (
      <>
        {/* Mobile — System D unboxed cut-line tables (D3 Task 5). One SecHead
            per group, the shared table rows, the cut line after 2nd, and the
            qualification footnote once under the first table. */}
        <div className="">
          {groups.map((block, i) => (
            <GroupTableSection
              key={block.letter}
              block={block}
              fromParam={fromParam}
              showFootnote={i === 0}
              withSchedule
              topClass={i === 0 ? "mt-6" : "mt-8"}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
          ))}
        </div>

        {/* Desktop — legacy card grid, pixel-frozen until D4. */}
      </>
    );
  }

  // Preview mode. Lead with the followed group (when present), then show
  // one row (two columns) of the next groups, then a "View all" link.

  // Mobile preview leads with the personal group table (per the d-tournament
  // mock, which shows the followed group on the overview). No follow yet →
  // show the first two groups so the overview never reads empty. Every group
  // stays reachable via "View all groups".
  const followedBlock = followedCountry
    ? groups.find((g) => g.rows.some((r) => r.isSelected)) ?? null
    : null;

  const mobilePreviewBlocks = followedBlock ? [followedBlock] : groups.slice(0, 2);

  return (
    <>
      {/* Mobile — the personal group table (System D), then a link to all. */}
      <div className="">
        {mobilePreviewBlocks.map((block, i) => (
          <GroupTableSection
            key={block.letter}
            block={block}
            fromParam={fromParam}
            showFootnote={i === 0}
            withSchedule={false}
            topClass={i === 0 ? "mt-2" : "mt-8"}
            gameOrigin={gameOrigin}
            gameReturnTo={gameReturnTo}
          />
        ))}
        <Link
          href={`/tournament/${tournamentId}/groups`}
          aria-label={`View all ${groups.length} groups`}
          className="mt-[14px] inline-flex items-center gap-[6px] uppercase transition active:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--mute-1)",
          }}
        >
          View all {groups.length} groups
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Desktop — legacy preview columns, pixel-frozen until D4. */}
    </>
  );
}
