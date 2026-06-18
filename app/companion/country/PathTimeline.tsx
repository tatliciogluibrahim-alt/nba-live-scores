"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { HIDDEN_CAPTIONS } from "../spoiler/safe-text";
import { useNoSpoilers } from "../providers";
import type { PathStage } from "./country-data";

// Possible-path timeline. Scenario language only — see HANDOFF.md §10
// for the full cut list. Each stage shows a calm structural sentence.
// The Group stage is always marked "in progress" or "starting"; later
// stages stay "possible path" until a real fixture lands in them.
//
// Pre-tournament: optionally render a restrained placeholder above the
// timeline so the screen stays structural, not forecast-flavored.

export function PathTimeline({
  stages,
  tournamentStarted,
}: {
  stages: PathStage[];
  tournamentStarted: boolean;
}) {
  const noSpoilers = useNoSpoilers();

  // Until a real knockout fixture lands, every stage past the group is
  // identical filler ("Possible path. Eight teams left."), so the six
  // full cards are dead vertical space that pushes the useful match info
  // down. Pre-knockout we collapse the path to a single calm breadcrumb;
  // we only expand to the detailed cards once an actual knockout stage is
  // reached (which is also the point the detail copy stops being generic).
  const anyKnockoutReached = stages.some(
    (s) => s.key !== "group" && s.reached
  );
  // Index of the furthest stage to emphasize in the breadcrumb. Under
  // No-Spoilers we don't highlight beyond the group (advancement leak).
  const currentIdx = (() => {
    if (noSpoilers) return 0;
    let i = 0;
    stages.forEach((s, idx) => {
      if (s.reached) i = idx;
    });
    return i;
  })();

  if (!anyKnockoutReached) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Possible path</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <div
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-[14px] border px-3 py-3"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          {stages.map((stage, idx) => {
            const on = idx === currentIdx;
            return (
              <span key={stage.key} className="flex items-center gap-x-1.5">
                {idx > 0 ? (
                  <span aria-hidden style={{ color: "var(--mute-2)", fontSize: 12 }}>
                    →
                  </span>
                ) : null}
                <span
                  className="text-[12.5px]"
                  style={{
                    color: on ? "var(--ink)" : "var(--mute-1)",
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {stage.label}
                </span>
              </span>
            );
          })}
        </div>
        <p
          className="mt-2 text-[11px]"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          {tournamentStarted
            ? "Path fills in after the group stage."
            : "Path updates when the tournament begins."}
        </p>
      </section>
    );
  }

  // Under No-Spoilers, mark all post-group stages as "context hidden"
  // because "reached" itself implies the country survived prior rounds.
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Possible path</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <ol className="space-y-2">
        {stages.map((stage, idx) => {
          const reached = stage.reached;
          // Spoiler gate: only the group stage is safe to mark "in
          // progress" without leaking; later "reached" stages imply
          // advancement. Hide those under No-Spoilers.
          const hideReachedState = noSpoilers && reached && stage.key !== "group";
          const displayReached = reached && !hideReachedState;

          // Pre-tournament: the Group stage is technically "reached" in
          // the data model (the bracket exists, fixtures are scheduled),
          // but "In progress" misreads before the first whistle. Surface
          // it as a calm "Group set" until the tournament actually begins.
          const isGroupPreTournament = stage.key === "group" && !tournamentStarted;

          const stateLabel = hideReachedState
            ? "Hidden"
            : isGroupPreTournament
              ? "Group set"
              : reached
                ? "In progress"
                : "Possible path";

          // Pre-tournament Group detail: pair the "Group set" state with
          // a confident structural sentence so the row tells the user
          // what's true today (the group is fixed, dates are known).
          const stageDetail =
            isGroupPreTournament
              ? `Group is set. Matches begin June 11.`
              : hideReachedState
                ? HIDDEN_CAPTIONS.path
                : stage.detail;

          return (
            <li
              key={stage.key}
              className="flex items-start gap-3 rounded-[14px] border px-3 py-3"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{
                  background: displayReached ? "var(--wc)" : "transparent",
                  border: displayReached ? "none" : "1.5px solid var(--mute-2)",
                  color: displayReached ? "var(--cream)" : "var(--mute-1)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className="text-[14px]"
                    style={{
                      color: "var(--ink)",
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {stage.label}
                  </p>
                  <span
                    className="shrink-0 text-[10px] uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.08em",
                      color: hideReachedState ? "var(--mute-2)" : "var(--mute-1)",
                      fontWeight: 600,
                    }}
                  >
                    {stateLabel}
                  </span>
                </div>
                <p
                  className="mt-1 text-[12px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {stageDetail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p
        className="mt-3 text-[11px]"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        Updates as results come in.
      </p>
    </section>
  );
}
