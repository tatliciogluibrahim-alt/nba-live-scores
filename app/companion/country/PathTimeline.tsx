"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { HIDDEN_CAPTIONS } from "../spoiler/safe-text";
import { useNoSpoilers } from "../providers";
import type { PathStage } from "./country-data";

// Path to the final — the country page's signature element.
//
// One vertical journey for every state: a rail of stage nodes, solid
// green where the country has already travelled, dashed for the road
// ahead, the current stage ringed. Pre-tournament it reads as the route
// to the final; once knockouts begin each reached stage fills in with the
// real opponent (from country-data). No-Spoilers caps the revealed
// progress at the group stage — a later "reached" stage would leak that
// the country advanced — so under it the rail shows group as current and
// the rest as the (un-revealed) road ahead, details hidden.

export function PathTimeline({
  stages,
  tournamentStarted,
}: {
  stages: PathStage[];
  tournamentStarted: boolean;
}) {
  const noSpoilers = useNoSpoilers();

  // Furthest stage the country has reached — its live position on the
  // rail. No-Spoilers caps it at the group (index 0).
  const currentIdx = (() => {
    if (noSpoilers) return 0;
    let i = 0;
    stages.forEach((s, idx) => {
      if (s.reached) i = idx;
    });
    return i;
  })();

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <Eyebrow>Path to the final</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <ol>
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const done = idx < currentIdx;
          const current = idx === currentIdx;
          const future = idx > currentIdx;

          const isGroupPre = stage.key === "group" && !tournamentStarted;
          // A post-group "reached" detail names the next opponent / result,
          // which implies advancement — hide it under No-Spoilers.
          const hideDetail = noSpoilers && stage.reached && stage.key !== "group";

          const stateWord = isGroupPre ? "Group set" : current ? "In progress" : null;
          const detail = isGroupPre
            ? "Group is set. Matches begin June 11."
            : hideDetail
              ? HIDDEN_CAPTIONS.path
              : stage.detail;

          const filled = idx <= currentIdx; // node painted green
          const travelled = idx < currentIdx; // segment below is solid

          return (
            <li key={stage.key} className="flex gap-3">
              {/* Rail: node + connector to the next stage */}
              <div className="flex flex-col items-center" style={{ width: 22 }}>
                <span
                  aria-hidden
                  className="grid shrink-0 place-items-center rounded-full"
                  style={{
                    height: 18,
                    width: 18,
                    background: filled ? "var(--wc)" : "transparent",
                    border: filled ? "none" : "1.5px solid var(--mute-2)",
                    color: "var(--cream)",
                    boxShadow: current ? "0 0 0 4px var(--wc-soft)" : "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {done ? "✓" : ""}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    style={{
                      flex: 1,
                      minHeight: 24,
                      marginTop: 3,
                      marginBottom: 3,
                      width: travelled ? 2 : 0,
                      background: travelled ? "var(--wc)" : "transparent",
                      borderLeft: travelled ? "none" : "2px dashed var(--mute-2)",
                    }}
                  />
                ) : null}
              </div>

              {/* Content */}
              <div
                className="min-w-0 flex-1"
                style={{ paddingBottom: isLast ? 0 : 16 }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className="text-[14px]"
                    style={{
                      color: future ? "var(--mute-1)" : "var(--ink)",
                      fontWeight: current ? 800 : 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {stage.label}
                  </p>
                  {stateWord ? (
                    <span
                      className="shrink-0 text-[10px] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.08em",
                        color: "var(--wc)",
                        fontWeight: 700,
                      }}
                    >
                      {stateWord}
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-0.5 text-[12px] leading-snug"
                  style={{
                    color: "var(--mute-1)",
                    fontWeight: 500,
                    opacity: future ? 0.85 : 1,
                  }}
                >
                  {detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p
        className="mt-1 text-[11px]"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        {tournamentStarted
          ? "Updates as results come in."
          : "Path updates when the tournament begins."}
      </p>
    </section>
  );
}
