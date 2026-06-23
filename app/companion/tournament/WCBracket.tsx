"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildWCBracket,
  type BracketMatch,
  type BracketQuarter,
  type BracketSlot,
} from "./wc-bracket-data";

// Tournament-wide knockout bracket — quadrant-chunked so a 32-team tree
// never has to render cramped on a phone. Overview: the Final framed on
// top, the two semifinals, then the four quarters as cards. Tap a quarter
// to open its calm 8-team mini-tree (R32 -> R16 -> QF). Real matchups +
// results come from ESPN via buildWCBracket; unset slots show honest
// bracket labels. Followed countries are highlighted throughout.

function followedCountrySet(
  follows: { kind: string; id: string }[]
): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (f.kind === "country" || f.kind === "team") out.add(f.id.toUpperCase());
  }
  return out;
}

export function WCBracket() {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const [open, setOpen] = useState<number | null>(null);

  const bracket = buildWCBracket(fixtures, followedCountrySet(follows));

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <Eyebrow>Bracket</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {!bracket.resolved ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          The bracket fills in as the groups finish. Clinched teams take their
          slots; the rest stay open.
        </p>
      ) : null}

      {/* The destination: Final + the two semifinals. */}
      <div
        className="mb-4 rounded-[16px] border p-4"
        style={{ background: "var(--paper)", borderColor: "var(--line)", borderLeft: "3px solid var(--wc)" }}
      >
        <p
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.14em", color: "var(--wc)" }}
        >
          The final{bracket.final?.dateLabel ? ` · ${bracket.final.dateLabel}` : ""}
        </p>
        {bracket.final ? <MatchRow match={bracket.final} big /> : null}
        {bracket.semis.length > 0 ? (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <p
              className="mb-1.5 text-[10px] uppercase"
              style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--mute-1)" }}
            >
              Semifinals
            </p>
            <div className="space-y-1.5">
              {bracket.semis.map((m) => (
                <MatchRow key={`sf-${m.number}`} match={m} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* The four quarters. */}
      <div className="grid grid-cols-2 gap-2">
        {bracket.quarters.map((q) => (
          <QuarterCard
            key={q.index}
            quarter={q}
            open={open === q.index}
            onToggle={() => setOpen(open === q.index ? null : q.index)}
          />
        ))}
      </div>

      {open != null ? (
        <QuarterDetail quarter={bracket.quarters[open - 1]} />
      ) : null}
    </section>
  );
}

function QuarterCard({
  quarter,
  open,
  onToggle,
}: {
  quarter: BracketQuarter;
  open: boolean;
  onToggle: () => void;
}) {
  const known = quarter.knownTeams.slice(0, 3).join(" · ");
  const more = quarter.knownTeams.length - 3;
  const summary =
    quarter.knownTeams.length === 0
      ? "Teams to be set"
      : more > 0
        ? `${known} +${more}`
        : known;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex min-h-[64px] flex-col items-start justify-between rounded-[14px] border px-3 py-2.5 text-left transition active:scale-[0.99]"
      style={{
        background: "var(--paper)",
        borderColor: open ? "var(--wc)" : "var(--line)",
        borderLeft: quarter.hasFollowed ? "3px solid var(--wc)" : undefined,
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.1em", color: "var(--mute-1)" }}
        >
          Quarter {quarter.index}
        </span>
        <span aria-hidden style={{ color: "var(--mute-2)", fontSize: 12 }}>
          {open ? "▾" : "›"}
        </span>
      </div>
      <span
        className="mt-1 text-[12px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {summary}
      </span>
    </button>
  );
}

function QuarterDetail({ quarter }: { quarter: BracketQuarter }) {
  return (
    <div
      className="mt-2 rounded-[16px] border p-4"
      style={{ background: "var(--cream-2)", borderColor: "var(--wc)" }}
    >
      <RoundBlock label="Round of 32" matches={quarter.r32} />
      <RoundBlock label="Round of 16" matches={quarter.r16} />
      {quarter.qf ? <RoundBlock label="Quarterfinal" matches={[quarter.qf]} /> : null}
    </div>
  );
}

function RoundBlock({ label, matches }: { label: string; matches: BracketMatch[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <p
        className="mb-1.5 text-[10px] uppercase"
        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--wc)" }}
      >
        {label}
      </p>
      <div className="space-y-1.5">
        {matches.map((m) => (
          <MatchRow key={`${m.round}-${m.number}`} match={m} />
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match, big = false }: { match: BracketMatch; big?: boolean }) {
  const body = (
    <div
      className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2"
      style={{ background: "var(--cream)", borderColor: "var(--line)" }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SlotLine slot={match.away} big={big} />
        <SlotLine slot={match.home} big={big} />
      </div>
      {match.dateLabel ? (
        <span
          className="shrink-0 text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--mute-2)", fontWeight: 600 }}
        >
          {match.status === "final" ? "FT" : match.dateLabel}
        </span>
      ) : null}
    </div>
  );
  return match.href ? (
    <Link href={match.href} aria-label="Open match">
      {body}
    </Link>
  ) : (
    body
  );
}

function SlotLine({ slot, big }: { slot: BracketSlot; big: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={big ? "text-[14px]" : "text-[13px]"}
        style={{
          color: slot.real ? "var(--ink)" : "var(--mute-1)",
          fontWeight: slot.followed ? 800 : slot.real ? 700 : 500,
        }}
      >
        {slot.real ? slot.code : slot.label}
      </span>
      {slot.score != null ? (
        <span
          className={big ? "text-[14px]" : "text-[13px]"}
          style={{ color: "var(--ink)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
        >
          {slot.score}
        </span>
      ) : null}
    </div>
  );
}
