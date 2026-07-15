"use client";

import Link from "next/link";
import { Stamp } from "../system/Stamp";
import { Spoiler } from "../spoiler/Spoiler";
import { useFollows, useNoSpoilers } from "../providers";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { followHidesParticipants } from "../spoiler/follow-match";
import { useIsNative } from "../dev/native-detect";
import { slotState, MAX_LOCK_SCREEN_SLOTS } from "../system/lock-screen-slots";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { withGameOrigin } from "../game/game-origin";
import { parseScoreLine, trackedStampText } from "./watching-data";
import type { PinnedItem, WatchingPayload } from "./watching-data";

// LiveRoom — the live tracking register.
//
// The full-ink LiveRoomField renders at every width now (D4b): mobile bleeds
// it to the screen gutter, desktop bleeds it to the content-box edge. The
// legacy ≥2-pin ScoreModule card dock (LiveRoom / LiveRoomCard / ClosestChip)
// is retired — both widths use the ink field below.

// ── Live Room — the full-ink field (System D) ──────────────────────────
//
// Watching IS the live surface, so the Live Room takes the ink register at
// full strength: a solid ink field holding one board row per live pin, each
// with its own progress rail, a promoted lock-screen slot meter in the label
// row, and a cream "switch to the closest game" pill. Mirrors
// docs/superpowers/design-directions/d-watching.html + d-docking.html.
//
// Gates on ANY live pin (≥1) — Watching is the tracking surface, so a live
// tracked game always sits in the room (the single-game §8 flow is the
// common case). Non-live pins render in the TRACKED list below via
// WatchingDashboard. Rendered in both the mobile and desktop branches (D4b);
// the wrapper bleeds edge-to-edge with -mx-4 on mobile and md:-mx-[18px] on
// desktop, like the Today ALSO LIVE band.

export function LiveRoomField({ payload }: { payload: WatchingPayload }) {
  const noSpoilers = useNoSpoilers();
  const { follows } = useFollows();
  const native = useIsNative();
  const liveItems = payload.items.filter((i) => i.status === "live");
  if (liveItems.length < 1) return null;

  // payload.items keeps live in newest-pinned-first order — the same order the
  // LiveActivitySync poll grants lock-screen slots in.
  const liveIds = liveItems.map((i) => i.id);
  const used = slotState(liveIds, liveIds[0] ?? "").used;
  // Native shows the promoted lock-screen slot meter; web has no lock screen,
  // so it shows a plain live count instead.
  const meter = native
    ? `◉ ${used} of ${MAX_LOCK_SCREEN_SLOTS} lock screen slots`
    : `${liveItems.length} live`;

  // Only surface the closest-game pill when one live game is meaningfully
  // tighter (single-digit margin) — a "no ambiguity, no nag" gate.
  // closestLive is NBA-only by construction, and it's suppressed under
  // No-Spoilers (revealing "who's close" is a soft spoiler). The ≥2 guard
  // means with one live game there is nothing to switch to (the ≥1 room gate
  // made single-live the common case).
  // "Closest" compares every live score. If even one row is selectively
  // hidden, suppress the comparison so the pill cannot leak that hidden
  // game's margin relative to the visible rows.
  const anySelectiveHidden = liveItems.some((item) =>
    followHidesParticipants(
        follows,
        item.source === "wc"
          ? {
              countryCodes: [item.awayCode, item.homeCode],
            }
          : { teamCodes: [item.awayCode, item.homeCode] }
      )
  );
  const showClosest =
    !noSpoilers &&
    !anySelectiveHidden &&
    liveItems.length >= 2 &&
    payload.closestLive != null &&
    payload.closestLive.margin <= 9;

  return (
    // -mx-4 bleeds to the mobile screen gutter; md:-mx-[18px] bleeds to the
    // desktop content-box edge out of the 18px editorial gutter (D4b). The
    // inner 18px padding realigns the rows either way. Inert below md, so the
    // mobile render is unchanged.
    <div className="-mx-4 md:-mx-[18px] mb-5">
      <div
        style={{
          background: "var(--ink-field-bg)",
          color: "var(--cream-on-ink)",
          padding: "16px 18px 18px",
        }}
      >
        {/* Label row: LIVE ROOM + promoted meter */}
        <div
          className="mb-1 flex items-baseline justify-between uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "var(--cream-on-ink-dim)",
          }}
        >
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="no-noise-live-fade inline-block rounded-full"
              style={{ width: 6, height: 6, background: "var(--cream)" }}
            />
            Live room
          </span>
          <span className="tabular-nums lining-nums" style={{ color: "var(--cream-on-ink)" }}>
            {meter}
          </span>
        </div>

        {liveItems.map((item, i) => (
          <LiveRoomRow key={item.id} item={item} idx={i} liveIds={liveIds} />
        ))}

        {showClosest && payload.closestLive ? (
          <ClosestPill targetId={payload.closestLive.id} />
        ) : null}
      </div>
    </div>
  );
}

// One live pin as an ink board row + its own progress rail. The score is
// Spoiler-wrapped exactly like Today's ALSO LIVE band (global toggle OR a
// per-follow hide frosts it; one tap reveals just this game, session-scoped),
// so the ink chrome shows WHAT is live without leaking WHO's ahead.
function LiveRoomRow({
  item,
  idx,
  liveIds,
}: {
  item: PinnedItem;
  idx: number;
  liveIds: string[];
}) {
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame(
    item.source === "wc"
      ? { countryCodes: [item.awayCode, item.homeCode] }
      : { teamCodes: [item.awayCode, item.homeCode] }
  );
  const hidden = globalNoSpoilers || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(item.id);

  // ◉ marks the first MAX_LOCK_SCREEN_SLOTS live pins (the lock-screen slot
  // holders); any overflow live pin falls back to its running ordinal.
  const holds = slotState(liveIds, item.id).holds;
  const mark = holds ? "◉" : String(idx + 1).padStart(2, "0");

  const [awayScore, homeScore] = parseScoreLine(item.scoreLine);
  const score = `${awayScore ?? 0}–${homeScore ?? 0}`;

  const sport = item.source === "wc" ? "wc" : "nba";
  const accent = sport === "wc" ? "var(--wc)" : "var(--nba)";
  // Same lock-screen parity rail as PinnedCard: structural (no score leak),
  // safe under No-Spoilers. Minimal on the ink field — accent fill on a
  // cream-hairline track, a cream position knob, no ticks / end labels.
  const progress = computeLiveActivityProgress(sport, item.detailLine ?? "", item.status);
  const pct = `${Math.max(0, Math.min(1, progress)) * 100}%`;

  return (
    <GameSpoilerScope gameId={item.id} hidden={hidden}>
      <div
        className="relative block"
        style={{
          borderTop: idx === 0 ? "none" : "1px solid var(--line-on-ink)",
          paddingTop: 14,
          paddingBottom: 12,
        }}
      >
        <Link
          href={item.href}
          aria-label={`Open ${item.spoilerSubject}, live`}
          className="absolute inset-0 active:opacity-80"
        />
        <div
          className="flex items-center gap-[10px] tabular-nums lining-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span style={{ fontSize: 10, color: "var(--cream-on-ink-dim)", minWidth: 18 }}>
            {mark}
          </span>
          <span
            className="min-w-0 flex-1"
            style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.02em" }}
          >
            {item.awayCode} · {item.homeCode}
          </span>
          <span
            style={{
              fontSize: 21,
              fontWeight: 800,
              letterSpacing: "0.01em",
              ...(resultHidden ? { position: "relative", zIndex: 1 } : {}),
            }}
          >
            <Spoiler gameId={item.id} ariaSubject={item.spoilerSubject}>
              {score}
            </Spoiler>
          </span>
          <Stamp text={trackedStampText(item)} variant="onInk" />
          <span aria-hidden style={{ color: "var(--cream-on-ink-dim)" }}>
            →
          </span>
        </div>

        <div
          className="relative"
          style={{ marginTop: 10, height: 2, background: "var(--line-on-ink)" }}
          aria-hidden
        >
          <div
            className="absolute bottom-0 left-0 top-0"
            style={{ width: pct, background: accent }}
          />
          <div
            className="absolute"
            style={{
              left: pct,
              top: "50%",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--cream)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
    </GameSpoilerScope>
  );
}

// The closest-game suggestion, mobile: a reversed cream pill on the ink
// field (a CTA earns its shape). Copy is deliberately neutral — never who's
// winning or the gap — so it stays safe even as the live scores move.
function ClosestPill({ targetId }: { targetId: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <Link
        href={withGameOrigin(`/game/${targetId}`, "watching")}
        aria-label="Switch to the closest game"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 transition active:scale-[0.97]"
        style={{ background: "var(--cream)", color: "var(--ink)", fontSize: 12, fontWeight: 700 }}
      >
        <span
          aria-hidden
          className="no-noise-live-fade h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--live)" }}
        />
        Switch to the closest game
      </Link>
    </div>
  );
}
