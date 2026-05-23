"use client";

import { Eyebrow } from "../atoms/Eyebrow";
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

  // Under No-Spoilers, mark all post-group stages as "context hidden"
  // because "reached" itself implies the country survived prior rounds.
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Possible path</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {!tournamentStarted ? (
        <p
          className="mb-3 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Path updates when the tournament begins.
        </p>
      ) : null}

      <ol className="space-y-2">
        {stages.map((stage, idx) => {
          const reached = stage.reached;
          // Spoiler gate: only the group stage is safe to mark "in
          // progress" without leaking; later "reached" stages imply
          // advancement. Hide those under No-Spoilers.
          const hideReachedState = noSpoilers && reached && stage.key !== "group";

          const stateLabel = hideReachedState
            ? "Hidden"
            : reached
              ? "In progress"
              : "Possible path";

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
                  background: reached ? "var(--wc)" : "transparent",
                  border: reached ? "none" : "1.5px solid var(--mute-2)",
                  color: reached ? "var(--cream)" : "var(--mute-1)",
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
                  {hideReachedState
                    ? "Path context hidden by No-Spoilers mode."
                    : stage.detail}
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
