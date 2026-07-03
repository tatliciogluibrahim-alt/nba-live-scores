"use client";

import { Stamp } from "../system/Stamp";
import { FollowDrawerBody, type FollowCardData } from "./FollowCard";
import { tierStampProps } from "./following-view";

// System D follow row (D3 Task 2). The agate register of the Following
// dashboard: an unboxed, ruled row per follow — display-strand name, a mono
// meta line (the follow's own detail string), a breathing LIVE tag when a
// game is on, and the §4 tier Stamp doing the semantic work (the stamp IS
// the alert state). Chevron-free: the whole row is the affordance. Tapping
// it toggles the SAME drawer FollowCard uses (FollowDrawerBody), which is the
// one enclosure-legal complex unit — bell, tier PresetRow, per-follow
// No-Spoilers, unfollow, all intact.
//
// Expanded state is lifted to the parent (FollowingDashboard's mobile column)
// so it owns which rows are open. See d-following.html `.followrow`.

export function FollowRow({
  data,
  expanded,
  onToggleExpand,
}: {
  data: FollowCardData;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { follow, name, detail, kindLabel, wrapped, isLive } = data;
  const stamp = tierStampProps(follow);
  const bodyId = `followrow-${follow.kind}-${follow.id}-body`;
  // Mono meta line: the follow's own detail ("GROUP D · SUMMER SOCCER",
  // "EASTERN CONFERENCE", "BEST-OF-7 SERIES"), uppercased on the field.
  // Falls back to the kind label when a follow carries no detail so the
  // row never shows an empty second line.
  const meta = detail || kindLabel;

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3 text-left transition active:opacity-80"
        style={{ padding: "14px 0" }}
      >
        <span className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: wrapped ? "var(--mute-1)" : "var(--ink)",
            }}
          >
            {name}
          </span>
          <span
            className="mt-[2px] block truncate uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--mute-2)",
            }}
          >
            {meta}
          </span>
        </span>

        {isLive ? (
          // The pulsing dot means live, exclusively (spec §5). --live is
          // the one "right now" accent across D1/D2/D3.
          <span
            className="flex shrink-0 items-center gap-[5px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--live)",
            }}
          >
            <span
              aria-hidden
              className="no-noise-live-fade inline-block rounded-full"
              style={{ width: 6, height: 6, background: "var(--live)" }}
            />
            Live
          </span>
        ) : null}

        <Stamp text={stamp.text} variant={stamp.variant} />
      </button>

      {/* Row expansion — the shared FollowCard drawer, animated open via the
          same grid-rows 0fr→1fr transition. Sits above the row's bottom
          hairline so a collapsed row reads exactly like the mock. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div id={bodyId} className="pb-4 pt-1">
            <FollowDrawerBody follow={follow} name={name} wrapped={wrapped} />
          </div>
        </div>
      </div>
    </div>
  );
}
