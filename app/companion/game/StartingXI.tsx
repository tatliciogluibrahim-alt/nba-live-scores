"use client";

import { SecHead } from "../system/SecHead";
import type { StartingXITeam, WCLineups } from "../../lib/wc-lineups";

// Starting XI — the matchday-programme lineups module (spec §17). Two columns,
// one per side, printed like a matchday programme. Shirt numbers ARE the index
// numerals (the system's index device becomes the jersey). Values copied from
// the `.xi` block in docs/superpowers/design-directions/d-game.html.
//
// Lineups are NOT spoilers (§17) — this section is never Spoiler-wrapped.

// Anchor for the "Lineups are in" deck row to scroll to.
export const STARTING_XI_ANCHOR = "starting-xi";

function scrollToXI() {
  if (typeof document === "undefined") return;
  document
    .getElementById(STARTING_XI_ANCHOR)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// The quiet deck disclosure row (spec §17): once lineups land pre-match, the
// deck area gains one calm agate row that scrolls to the section. Never an
// alert, never a badge. Mounted by WCGameDetail only when upcoming && announced.
export function LineupsAreInRow() {
  return (
    <button
      type="button"
      onClick={scrollToXI}
      className="flex w-full items-center gap-1.5 text-left transition active:opacity-70"
      style={{
        padding: "12px 0",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ink)",
      }}
    >
      Lineups are in
      <span aria-hidden style={{ color: "var(--mute-2)" }}>
        →
      </span>
    </button>
  );
}

function XIColumn({ team }: { team: StartingXITeam }) {
  return (
    <div>
      <p
        className="tabular-nums lining-nums uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "var(--mute-1)",
          padding: "10px 0 6px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {[team.code, team.formation].filter(Boolean).join(" · ")}
      </p>
      {team.starters.map((player, index) => (
        <div
          key={`${player.jersey}-${player.name}-${index}`}
          className="flex items-baseline gap-2"
          style={{
            padding: "6.5px 0",
            borderBottom: "1px solid var(--line)",
            fontSize: 12.5,
            fontWeight: 600,
            // Subbed-off starters keep their row, muted (D4 6c).
            color: player.subbedOffMinute ? "var(--mute-1)" : "var(--ink)",
          }}
        >
          <span
            className="tabular-nums lining-nums shrink-0"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--mute-2)",
              minWidth: 16,
            }}
          >
            {/* Zero-padded per spec §17 ("09 GÜLER") — index-numeral device. */}
            {player.jersey ? player.jersey.padStart(2, "0") : player.jersey}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {player.name}
            {player.captain ? " (C)" : ""}
          </span>
          {player.subbedOffMinute ? (
            <span
              className="shrink-0 tabular-nums lining-nums"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--mute-2)",
              }}
            >
              → {player.subbedOffMinute}
            </span>
          ) : null}
        </div>
      ))}

      {/* Entrants — quiet SUBS block beneath the column. Nothing renders
          until a sub actually happens (no empty head). */}
      {team.subs && team.subs.length > 0 ? (
        <>
          <p
            className="uppercase"
            style={{
              margin: "10px 0 2px",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "var(--mute-2)",
            }}
          >
            Subs
          </p>
          {team.subs.map((sub, i) => (
            <div
              key={`${sub.jersey}-${sub.name}-${i}`}
              className="flex items-baseline gap-2"
              style={{
                padding: "5px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              <span
                aria-hidden
                className="shrink-0"
                style={{ fontSize: 10, color: "var(--mute-2)" }}
              >
                ↳
              </span>
              <span
                className="tabular-nums lining-nums shrink-0"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--mute-2)",
                  minWidth: 16,
                }}
              >
                {sub.jersey ? sub.jersey.padStart(2, "0") : sub.jersey}
              </span>
              <span className="min-w-0 flex-1 truncate">{sub.name}</span>
              {sub.minute ? (
                <span
                  className="shrink-0 tabular-nums lining-nums"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--mute-2)",
                  }}
                >
                  {sub.minute}
                </span>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

export function StartingXI({
  lineups,
  status,
}: {
  lineups: WCLineups | null;
  status: "live" | "upcoming" | "final";
}) {
  // Hard failure / not fetched → render nothing (never an error UI).
  if (!lineups) return null;

  const pending = "pending" in lineups;
  // The pending copy only makes sense before kickoff. A live/final match with
  // missing roster data renders nothing rather than a stale "before kickoff".
  if (pending && status !== "upcoming") return null;

  return (
    <section id={STARTING_XI_ANCHOR} className="px-[18px] pt-6">
      {pending ? (
        // Pre-match, no roster yet. One muted SecHead-style line carries the
        // section name AND the timing note together, so an absent section
        // isn't a confident ink head sitting over a separate muted sub-label.
        <div
          style={{
            paddingBottom: 8,
            borderBottom: "2px solid var(--ink)",
            marginBottom: 2,
          }}
        >
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "var(--mute-1)",
            }}
          >
            Starting XI · about an hour before kickoff
          </span>
        </div>
      ) : (
        <>
          <SecHead name="Starting XI" />
          <div
            className="grid grid-cols-2"
            style={{ gap: "0 18px", paddingTop: 4 }}
          >
            {lineups.teams.map((team, index) => (
              <XIColumn key={team.code || index} team={team} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
