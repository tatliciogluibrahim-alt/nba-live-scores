"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useFollows } from "../providers";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import {
  buildAllGroupsFromSchedule,
  type GroupDetail,
  type GroupRow,
  type GroupScheduleRow,
  type WCScheduleFixtureLite,
  type WCScheduleStandingLite,
} from "../country/country-data";

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
};

async function fetchSchedule(): Promise<SchedulePayload> {
  try {
    const res = await fetch("/api/world-cup/schedule", { cache: "no-store" });
    if (!res.ok) return { fixtures: [], standings: {} };
    const json = (await res.json()) as Partial<SchedulePayload>;
    return { fixtures: json.fixtures ?? [], standings: json.standings ?? {} };
  } catch {
    return { fixtures: [], standings: {} };
  }
}

function useWCSchedule(): {
  fixtures: WCScheduleFixtureLite[];
  standings: Record<string, WCScheduleStandingLite[]>;
  hydrated: boolean;
} {
  const [data, setData] = useState<SchedulePayload>({
    fixtures: [],
    standings: {},
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
    hydrated,
  };
}

// ── Preview mode (tournament page) — compact group columns ─────────────

function CountryRow({
  row,
  fromParam,
  isLast,
}: {
  row: GroupRow;
  fromParam: string;
  isLast: boolean;
}) {
  const nameColor = row.isSelected ? "var(--wc)" : "var(--ink)";
  const codeColor = row.isSelected ? "var(--wc)" : "var(--mute-1)";
  const standing = row.standing;

  return (
    <Link
      href={`/country/${row.code}?from=${fromParam}`}
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
  fromParam,
}: {
  block: { letter: string; rows: GroupRow[] };
  fromParam: string;
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
            fromParam={fromParam}
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

// ── Full mode (groups page) — stacked schedule-first cards ─────────────

const ORDINAL = ["", "1st", "2nd", "3rd", "4th"];

function GroupStatusChip({ phase }: { phase: GroupDetail["phase"] }) {
  const label =
    phase === "complete"
      ? "Complete"
      : phase === "live"
        ? "In progress"
        : "Upcoming";
  return (
    <span
      className="shrink-0 text-[10px] uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        color: "var(--mute-1)",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function GroupTeamRow({
  row,
  fromParam,
  isLast,
}: {
  row: GroupRow;
  fromParam: string;
  isLast: boolean;
}) {
  const nameColor = row.isSelected ? "var(--wc)" : "var(--ink)";
  const codeColor = row.isSelected ? "var(--wc)" : "var(--mute-1)";
  const s = row.standing;
  const standingLine =
    s && s.played > 0
      ? `${ORDINAL[s.position] ?? `${s.position}th`} · ${s.played} GP · ${s.points} PTS · ${s.gd > 0 ? "+" : ""}${s.gd} GD`
      : null;

  return (
    <Link
      href={`/country/${row.code}?from=${fromParam}`}
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
        {standingLine ? (
          <div
            className="mt-0.5 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              color: "var(--mute-1)",
              fontWeight: 600,
            }}
          >
            {standingLine}
          </div>
        ) : null}
      </div>
      <span
        className="shrink-0 text-[11px] uppercase"
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

function ScheduleRow({ match }: { match: GroupScheduleRow }) {
  const live = match.status === "live";
  const played = match.status === "live" || match.status === "final";
  const hasScore = match.awayScore != null && match.homeScore != null;
  const state = statusWord(match);

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
            <Spoiler
              gameId={match.id}
              ariaSubject={`${match.awayCode} versus ${match.homeCode}`}
            >
              {match.awayScore} · {match.homeScore}
            </Spoiler>{" "}
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
  return match.href ? (
    <Link
      href={match.href}
      aria-label={`Open ${match.awayCode} versus ${match.homeCode}`}
      className="block transition active:scale-[0.99]"
    >
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

function ScheduleList({ schedule }: { schedule: GroupScheduleRow[] }) {
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
            <ScheduleRow key={`${m.id}-${m.awayCode}`} match={m} />
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

function GroupCard({
  block,
  fromParam,
}: {
  block: GroupDetail;
  fromParam: string;
}) {
  const [open, setOpen] = useState(false);
  const hasSelected = block.rows.some((r) => r.isSelected);

  return (
    <article
      className="rounded-[16px] border"
      style={{
        background: "var(--paper)",
        borderColor: hasSelected ? "var(--wc)" : "var(--line)",
      }}
    >
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow color={hasSelected ? "var(--wc)" : undefined}>
            Group {block.letter}
          </Eyebrow>
          <GroupStatusChip phase={block.phase} />
        </div>

        <div className="mt-2.5">
          {block.rows.map((row, idx) => (
            <GroupTeamRow
              key={row.code}
              row={row}
              fromParam={fromParam}
              isLast={idx === block.rows.length - 1}
            />
          ))}
        </div>
      </div>

      <div
        className="border-t px-4 py-2.5"
        style={{ borderColor: "var(--line)" }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} Group ${block.letter} matches`}
          className="flex min-h-[32px] w-full items-center justify-between gap-3 text-left"
        >
          <span
            className="min-w-0 truncate text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {nextLine(block)}
          </span>
          <span
            className="shrink-0 text-[11px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            {open ? "Matches ↑" : "Matches ↓"}
          </span>
        </button>
        {open ? <ScheduleList schedule={block.schedule} /> : null}
      </div>
    </article>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function WCGroups({
  tournamentId,
  mode,
}: {
  tournamentId: string;
  mode: "preview" | "full";
}) {
  const { follows } = useFollows();
  const followedCountry = follows.find((f) => f.kind === "country")?.id;
  const { fixtures, standings, hydrated } = useWCSchedule();

  const groups = useMemo(
    () => buildAllGroupsFromSchedule(fixtures, standings, followedCountry),
    [fixtures, standings, followedCountry]
  );

  if (!hydrated) {
    return (
      <section className="mt-5" aria-busy aria-live="polite">
        <div className="space-y-3">
          {Array.from({ length: mode === "full" ? 4 : 1 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] rounded-[16px]"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  // `fromParam` encodes BOTH the tournament id and which view the user is
  // leaving from. Country detail's resolveBackTarget parses the `:groups`
  // suffix and routes back to this full-groups page instead of the
  // condensed tournament page.
  const fromParam = mode === "full" ? `${tournamentId}:groups` : tournamentId;

  if (mode === "full") {
    return (
      <section className="mt-6 pb-2">
        <GroupsHeader count={"Group stage"} />
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {groups.map((block) => (
            <GroupCard
              key={block.letter}
              block={block}
              fromParam={fromParam}
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
      <GroupsHeader count={"Group stage"} />

      {followedBlock ? (
        <div className="mb-5">
          <GroupColumn block={followedBlock} fromParam={fromParam} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {previewOthers.map((block) => (
          <GroupColumn key={block.letter} block={block} fromParam={fromParam} />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href={`/tournament/${tournamentId}/groups`}
          className="inline-flex min-h-[36px] items-center gap-1.5 text-[12px] underline decoration-dotted underline-offset-4"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
          aria-label="View all 12 Summer Soccer groups"
        >
          View all {groups.length} groups →
        </Link>
      </div>
    </section>
  );
}
