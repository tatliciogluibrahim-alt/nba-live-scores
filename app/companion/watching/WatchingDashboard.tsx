"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Display } from "../atoms/Display";
import { SecHead } from "../system/SecHead";
import { TrackedAgateRow, StaleAgateRow } from "./PinnedCard";
import { LiveRoomField } from "./LiveRoom";
import { useIsNative } from "../dev/native-detect";
import { usePinned } from "../providers";
import { buildWatchingMeta, isExpiredFinalPin } from "./watching-data";
import type { WatchingPayload } from "./watching-data";

// Watching — the tracking surface. One System D composition per width behind
// the md seam: the mobile ink Live Room + agate tracked list (WatchingMobile)
// and the desktop broadsheet (WatchingDesktop). Both render the SAME
// LiveRoomField, TrackedAgateRows, and StaleAgateRows — desktop is the mobile
// grammar at the wider column measure, not a separate design.

export function WatchingDashboard({ payload }: { payload: WatchingPayload }) {
  usePruneExpiredPins(payload);
  return (
    <section>
      {/* Mobile: System D recomposition — ink Live Room, agate tracked list */}
      <div className="md:hidden">
        <WatchingMobile payload={payload} />
      </div>

      {/* Desktop: System D broadsheet (D4b) — the same registers at column width */}
      <div className="hidden md:block">
        <WatchingDesktop payload={payload} />
      </div>
    </section>
  );
}

// Auto-remove finished pins ~24h after the match (WATCHING_FINAL_TTL_MS).
// The lock screen drops tracked games at final; this clears the in-app list
// a day later. Destructive by design (chosen over a non-destructive collapse):
// a game you tracked leaves Watching a day later with no undo but re-adding it.
// The processed-ids ref stops the unpin from firing twice for one id while the
// state update propagates.
function usePruneExpiredPins(payload: WatchingPayload) {
  const { unpinGame } = usePinned();
  const prunedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = Date.now();
    for (const item of payload.items) {
      if (prunedRef.current.has(item.id)) continue;
      if (isExpiredFinalPin(item, now)) {
        prunedRef.current.add(item.id);
        unpinGame(item.id);
      }
    }
  }, [payload.items, unpinGame]);
}

// ── Mobile (System D) ──────────────────────────────────────────────────

function WatchingMobile({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins, liveCount } = payload;
  const native = useIsNative();
  const meta = buildWatchingMeta(items, stalePins.length);

  // Mobile Live Room takes ANY live pin (≥1). Watching is the tracking
  // surface — a live tracked game under a "Tracked for later" heading reads
  // as a contradiction (the §8 single-game flow hits this constantly).
  // Desktop keeps its legacy ≥2 gate until D4.
  const liveRoomMode = liveCount >= 1;
  const restItems = liveRoomMode ? items.filter((i) => i.status !== "live") : items;

  // Split the non-live pins by status. A finished game must never sit under
  // "Tracked for later" — upcoming pins are still ahead of you, wrapped pins
  // are done. Each section renders only when it has rows; the Wrapped index
  // continues the running numeral after the later section so the whole tracked
  // list reads as one ordered ledger.
  const laterItems = restItems.filter((i) => i.status === "upcoming");
  const wrappedItems = restItems.filter((i) => i.status === "final");

  return (
    <>
      {/* Pagehead — "Watching." + mono meta (breathing dot when live) */}
      <Display
        as="h1"
        size="lg"
        style={{ fontWeight: 800, fontSize: "31px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
      >
        Watching.
      </Display>
      <p
        className="mt-2 mb-4 flex items-center gap-2 uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "var(--mute-1)",
        }}
      >
        {meta.live ? (
          <span
            aria-hidden
            className="no-noise-live-fade inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--live)" }}
          />
        ) : null}
        <span className="tabular-nums lining-nums">{meta.text}</span>
      </p>

      {/* Live Room ink field — self-gates to nothing when no pin is live */}
      <LiveRoomField payload={payload} />

      {/* Tracked for later — upcoming pins on sage plate. Full-bleed: -mx-4
          bleeds to screen edges; inner px-4 realigns content. Padding matches
          c4 mock (.sec = 18px 18px 6px). */}
      {laterItems.length > 0 ? (
        <section className="mt-2 -mx-4" style={{ background: "var(--plate-next)" }}>
          <div className="px-4 pt-[18px] pb-[6px]">
            <SecHead name="Tracked for later" count={String(laterItems.length)} />
            {laterItems.map((item, i) => (
              <TrackedAgateRow
                key={item.id}
                item={item}
                idx={String(i + 1).padStart(2, "0")}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Wrapped — finished pins on blush plate (winner emphasis kept). Every
          row is final, so the FT stamp is dropped as constant noise. Index
          continues after the later section. */}
      {wrappedItems.length > 0 ? (
        <section className="mt-6 -mx-4" style={{ background: "var(--plate-wrap)" }}>
          <div className="px-4 pt-[18px] pb-[6px]">
            <SecHead name="Wrapped" count={String(wrappedItems.length)} />
            {wrappedItems.map((item, i) => (
              <TrackedAgateRow
                key={item.id}
                item={item}
                idx={String(laterItems.length + i + 1).padStart(2, "0")}
                hideStamp
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Find a game to track — you track from a game (Today/Schedule), not
          from Following, which only configures teams + alerts. */}
      <Link
        href="/schedule?scope=all"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--mute-1)",
        }}
        aria-label="Find a game to track. Go to Schedule."
      >
        Find a game in Schedule
        <span aria-hidden>→</span>
      </Link>

      {/* Lock-screen footnote — native only (web has no lock screen) */}
      {native ? (
        <p
          className="mt-5 pt-[14px] uppercase"
          style={{
            borderTop: "1px solid var(--line)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--mute-2)",
          }}
        >
          Tracked games leave the lock screen at final.
        </p>
      ) : null}

      {/* Archived — stale pins, restyled to the agate register */}
      {stalePins.length > 0 ? (
        <section className="mt-6">
          <SecHead name="Archived" count={String(stalePins.length)} />
          {stalePins.map((pin) => (
            <StaleAgateRow key={pin.id} pin={pin} />
          ))}
        </section>
      ) : null}
    </>
  );
}

// ── Desktop (System D, D4b) ────────────────────────────────────────────
//
// The tracking surface at the broadsheet measure — the same LiveRoomField
// ink field, TrackedAgateRows, and StaleAgateRows as the mobile column, at
// column width. No Masthead here (BrandBar is mobile-only; the desktop
// sidebar rail carries the brand). Content sits in the 18px editorial gutter
// (the D4b desktop inset); the ink field + plate tints bleed out of it to the
// content-box edge. The Live Room takes ANY live pin (≥1), matching mobile —
// a live tracked game belongs in the room, not under "Tracked for later."

function WatchingDesktop({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins, liveCount } = payload;
  const native = useIsNative();
  const meta = buildWatchingMeta(items, stalePins.length);

  const liveRoomMode = liveCount >= 1;
  const restItems = liveRoomMode ? items.filter((i) => i.status !== "live") : items;
  const laterItems = restItems.filter((i) => i.status === "upcoming");
  const wrappedItems = restItems.filter((i) => i.status === "final");

  return (
    <section>
      {/* 18px editorial gutter — every non-plate block sits here; the ink
          field and plates bleed out of it and pad back to stay aligned. */}
      <div className="px-[18px]">
        {/* Pagehead — "Watching." + mono meta (breathing dot when live) */}
        <Display
          as="h1"
          size="lg"
          style={{ fontWeight: 800, fontSize: "31px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          Watching.
        </Display>
        <p
          className="mt-2 mb-4 flex items-center gap-2 uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "var(--mute-1)",
          }}
        >
          {meta.live ? (
            <span
              aria-hidden
              className="no-noise-live-fade inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--live)" }}
            />
          ) : null}
          <span className="tabular-nums lining-nums">{meta.text}</span>
        </p>

        {/* Live Room ink field — self-gates to nothing when no pin is live.
            The shared component's -mx-[18px] (md) bleeds it to the content-box
            edge; its internal 18px padding realigns the rows to the gutter. */}
        <LiveRoomField payload={payload} />

        {/* Tracked for later — upcoming pins on the sage plate; the tint
            bleeds out of the gutter and pads back. */}
        {laterItems.length > 0 ? (
          <section className="mt-2 -mx-[18px]" style={{ background: "var(--plate-next)" }}>
            <div className="px-[18px] pt-[18px] pb-[6px]">
              <SecHead name="Tracked for later" count={String(laterItems.length)} />
              {laterItems.map((item, i) => (
                <TrackedAgateRow
                  key={item.id}
                  item={item}
                  idx={String(i + 1).padStart(2, "0")}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Wrapped — finished pins on the blush plate (winner emphasis kept;
            FT stamp dropped as constant noise). Index continues after the
            later section. */}
        {wrappedItems.length > 0 ? (
          <section className="mt-6 -mx-[18px]" style={{ background: "var(--plate-wrap)" }}>
            <div className="px-[18px] pt-[18px] pb-[6px]">
              <SecHead name="Wrapped" count={String(wrappedItems.length)} />
              {wrappedItems.map((item, i) => (
                <TrackedAgateRow
                  key={item.id}
                  item={item}
                  idx={String(laterItems.length + i + 1).padStart(2, "0")}
                  hideStamp
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Find a game to track — you track from a game (Today/Schedule), not
          from Following, which only configures teams + alerts. */}
        <Link
          href="/schedule?scope=all"
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--mute-1)",
          }}
          aria-label="Find a game to track. Go to Schedule."
        >
          Find a game in Schedule
          <span aria-hidden>→</span>
        </Link>

        {/* Lock-screen footnote — native only (web has no lock screen) */}
        {native ? (
          <p
            className="mt-5 pt-[14px] uppercase"
            style={{
              borderTop: "1px solid var(--line)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--mute-2)",
            }}
          >
            Tracked games leave the lock screen at final.
          </p>
        ) : null}

        {/* Archived — stale pins, restyled to the agate register */}
        {stalePins.length > 0 ? (
          <section className="mt-6">
            <SecHead name="Archived" count={String(stalePins.length)} />
            {stalePins.map((pin) => (
              <StaleAgateRow key={pin.id} pin={pin} />
            ))}
          </section>
        ) : null}
      </div>
    </section>
  );
}
