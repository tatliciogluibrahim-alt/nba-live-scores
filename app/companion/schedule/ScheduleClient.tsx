"use client";

import { useState } from "react";
import { useFollows, useNoSpoilers } from "../providers";
import { useWCSchedule, WCGroups } from "../tournament/WCGroups";
import { ByDayView } from "../tournament/WCBracket";
import { WCBracketTree } from "../tournament/WCBracketTree";
import {
  buildBracketRounds,
  followedCountrySet,
} from "../tournament/wc-bracket-data";
import { WC_TOURNAMENT_ID } from "../following/data/tournaments";

// The Schedule surface (S1, 2026-07-06 spec: schedule-ia-waterfall).
// Contract: how does the whole competition unfold — complete, impersonal,
// structure and time only. It never filters to follows (Today does that);
// follows get row emphasis inside the shared views. It may never grow
// feed-like content.
//
// S1 renders the single active moment (Summer Soccer 2026). When a second
// moment is live simultaneously (NBA playoffs overlap, NFL later), a
// competition switcher renders above the view tabs and swaps the whole
// body — days for a cup, weeks for a season. Deliberately not built ahead
// of the second moment.

type View = "byday" | "bracket" | "groups";

export function ScheduleClient() {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const noSpoilers = useNoSpoilers();
  const { rounds } = buildBracketRounds(fixtures, followedCountrySet(follows));
  const [view, setView] = useState<View>("byday");

  return (
    <>
      <header>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          Schedule.
        </h1>
        {/* No-Spoilers structure doctrine (spec L7): scores hide,
            the shape of the schedule doesn't. Said once, plainly. */}
        {noSpoilers ? (
          <p
            className="mt-2 text-[12.5px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Scores stay hidden. The bracket still fills in as rounds finish.
          </p>
        ) : null}
      </header>

      <div className="mt-4">
        {/* View switch — same mono-segment grammar as the bracket page.
            STICKY ("freeze pane", parked feedback 2026-07-06): switching
            to BRACKET or GROUPS never requires scrolling back to the top. */}
        <div
          className="sticky z-20 -mx-4 mb-3 flex px-4 pt-1 md:mx-0 md:px-0"
          style={{
            // Pins BELOW the sticky BrandBar (z-30, safe-area padding +
            // 32px of content) — top-0 put the tabs underneath it.
            top: "calc(max(env(safe-area-inset-top), 12px) + 32px)",
            borderBottom: "1px solid var(--line)",
            background: "var(--bar-blur-bg, var(--cream))",
            backdropFilter: "blur(8px)",
          }}
        >
          {(
            [
              ["byday", "By day"],
              ["bracket", "Bracket"],
              ["groups", "Groups"],
            ] as const
          ).map(([key, label]) => {
            const on = key === view;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={on}
                className="flex-1 uppercase transition active:opacity-70"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  fontWeight: on ? 700 : 600,
                  color: on ? "var(--ink)" : "var(--mute-2)",
                  paddingTop: 2,
                  paddingBottom: 10,
                  background: "transparent",
                  borderBottom: on
                    ? "2px solid var(--ink)"
                    : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {view === "byday" ? <ByDayView rounds={rounds} /> : null}
        {view === "bracket" ? <WCBracketTree /> : null}
        {view === "groups" ? (
          <WCGroups tournamentId={WC_TOURNAMENT_ID} mode="full" />
        ) : null}
      </div>
    </>
  );
}
