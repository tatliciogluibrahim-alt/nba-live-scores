import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { tournamentPhase } from "./data/tournament-phase";
import type { FollowMoment } from "./FollowChoice";

// One moment block on the Follow picker hub. Renders the moment name
// + description + a vertical ladder of granularities (broadest first).
// Each granularity is a tappable row that routes to the existing
// picker for that follow type. The section is wrapped in a card with
// a sport-accent left rail so the eye groups everything inside as
// "this moment's options."
//
// Coming-soon state (e.g. NFL Season 2026 between Phase 9 scaffolding
// and Phase 12 build): the section still renders so users discover
// what's on the horizon, but the ladder rows are static (no Link, no
// hover, dimmed) and the section header carries a chip with the
// availability label. Keeps the picker honest — we don't pretend NFL
// works while the pipeline is still being wired.
//
// Adding a new moment (e.g. March Madness, Champions League) is just
// appending another FollowMoment entry — no layout changes needed.

export function MomentSection({ moment }: { moment: FollowMoment }) {
  const isComingSoon = Boolean(moment.comingSoon);
  // A concluded tournament dims + becomes non-followable here too, like a
  // coming-soon moment — but the chip reads "Season wrapped" and the rows
  // tail with "Wrapped" instead of "Not yet".
  const isConcluded =
    !isComingSoon &&
    !!moment.tournamentId &&
    tournamentPhase(moment.tournamentId) === "concluded";
  const isInactive = isComingSoon || isConcluded;

  return (
    <section
      // Anchor target for Pick Your Moment's scroll-into-view links
      // (Phase 21C-3). Stable, predictable per moment id so the
      // PickYourMoment component can deep-link without coupling to
      // the section's internal structure.
      id={`moment-${moment.id}`}
      className="overflow-hidden rounded-[14px] border scroll-mt-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: `4px solid ${moment.accent}`,
        // Subtle overall opacity dip on inactive (coming-soon / concluded)
        // sections so the active moments earn the user's eye first.
        opacity: isInactive ? 0.78 : 1,
      }}
    >
      {/* Section header — icon, name, description, optional chip. */}
      <header className="px-4 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
            {moment.icon}
          </span>
          <Eyebrow color={moment.accent}>{moment.name}</Eyebrow>
          {isInactive ? (
            <span
              className="ml-auto rounded-full px-2 py-0.5"
              style={{
                background: "var(--cream-2)",
                color: "var(--mute-1)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "1px solid var(--line)",
              }}
            >
              {moment.comingSoon ? moment.comingSoon.label : "Season wrapped"}
            </span>
          ) : null}
        </div>
        <p
          className="mt-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {moment.description}
        </p>
      </header>

      {/* Granularity ladder. Active sections render each row as a Link;
          coming-soon sections render each row as a static div with a
          "Not yet" tail so the row reads as informational. The shape
          stays identical so users see the same model regardless of
          whether they can act on it today. */}
      <ul>
        {moment.granularities.map((g) => {
          const inner = (
            <>
              <div className="min-w-0 flex-1">
                <Eyebrow>{g.eyebrow}</Eyebrow>
                <p
                  className="mt-1 text-[14px] leading-snug"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 700,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {g.title}
                </p>
                <p
                  className="mt-0.5 text-[12px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {g.detail}
                </p>
              </div>
              {isInactive ? (
                <span
                  className="shrink-0 text-[11px] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    color: "var(--mute-2)",
                    fontWeight: 600,
                  }}
                >
                  {isConcluded ? "Wrapped" : "Not yet"}
                </span>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--mute-1)"
                  strokeWidth="2.4"
                  aria-hidden
                  className="shrink-0"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </>
          );

          return (
            <li key={g.href + g.eyebrow}>
              {isInactive ? (
                <div
                  className="flex min-h-[64px] items-center gap-3 px-4 py-3"
                  style={{
                    background: "transparent",
                    color: "var(--ink)",
                    borderTop: "1px solid var(--line)",
                  }}
                  aria-label={`${moment.name}: ${g.title} (${isConcluded ? "season wrapped" : "coming soon"})`}
                >
                  {inner}
                </div>
              ) : (
                <Link
                  href={g.href}
                  aria-label={`${moment.name}: ${g.title}`}
                  className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition active:scale-[0.99]"
                  style={{
                    background: "transparent",
                    color: "var(--ink)",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
