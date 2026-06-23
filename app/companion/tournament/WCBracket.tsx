"use client";

import { useState } from "react";
import Link from "next/link";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildBracketRounds,
  type BracketMatch,
  type BracketSlot,
} from "./wc-bracket-data";
import type { KnockoutRoundKey } from "./knockout-data";

// Dedicated World Cup bracket — round by round, the mobile-first pattern
// (swipe/tap through R32 -> Final), not a cramped 32-team tree. Lives on
// its own page (/tournament/[id]/bracket), reached by an explicit entry,
// so it's a destination, not part of the core IA. Real ESPN data via
// buildBracketRounds: real matchups + scores, honest slot labels for unset
// slots, followed countries marked.

const SHORT: Record<KnockoutRoundKey, string> = {
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  final: "Final",
};

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
  const { rounds, resolved } = buildBracketRounds(
    fixtures,
    followedCountrySet(follows)
  );
  const [active, setActive] = useState<KnockoutRoundKey>("r32");
  const round = rounds.find((r) => r.key === active) ?? rounds[0];

  return (
    <section className="mt-4">
      {/* Round switcher — one calm gesture to move through the tournament. */}
      <div
        className="sticky top-0 z-10 -mx-4 mb-4 px-4 py-2"
        style={{ background: "var(--bar-blur-bg, var(--cream))", backdropFilter: "blur(8px)" }}
      >
        <div className="flex gap-1.5">
          {rounds.map((r) => {
            const on = r.key === active;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setActive(r.key)}
                aria-pressed={on}
                className="flex-1 rounded-full py-2 text-[12px] font-semibold transition active:scale-[0.97]"
                style={{
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--cream)" : "var(--ink)",
                  border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
                }}
              >
                {SHORT[r.key]}
              </button>
            );
          })}
        </div>
      </div>

      {!resolved ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          The bracket fills in as the groups finish. Clinched teams take their
          slots; the rest stay open.
        </p>
      ) : null}

      <div className="mb-2 flex items-baseline justify-between">
        <h2
          className="text-[15px]"
          style={{ color: "var(--ink)", fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          {round.label}
        </h2>
        {round.dateLabel ? (
          <span
            className="text-[11px] uppercase"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--mute-1)", fontWeight: 600 }}
          >
            {round.dateLabel}
          </span>
        ) : null}
      </div>

      {round.matches.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Not set yet.
        </p>
      ) : (
        <div className="space-y-2">
          {round.matches.map((m) => (
            <MatchCard key={`${m.round}-${m.number}`} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const tag =
    match.status === "final"
      ? "Full time"
      : match.status === "live"
        ? "Live"
        : match.dateLabel;
  const body = (
    <div
      className="flex items-center justify-between gap-2 rounded-[12px] border px-3.5 py-3"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <SlotLine slot={match.away} />
        <SlotLine slot={match.home} />
      </div>
      {tag ? (
        <span
          className="shrink-0 text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: match.status === "live" ? "var(--live)" : "var(--mute-2)", fontWeight: 700 }}
        >
          {tag}
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

function SlotLine({ slot }: { slot: BracketSlot }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="truncate text-[14px]"
        style={{
          color: slot.real ? "var(--ink)" : "var(--mute-1)",
          fontWeight: slot.followed ? 800 : slot.real ? 700 : 500,
        }}
      >
        {slot.followed ? "● " : ""}
        {slot.real ? slot.code : slot.label}
      </span>
      {slot.score != null ? (
        <span
          className="shrink-0 text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
        >
          {slot.score}
        </span>
      ) : null}
    </div>
  );
}
