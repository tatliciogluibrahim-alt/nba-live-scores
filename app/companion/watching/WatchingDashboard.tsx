"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { SecHead } from "../system/SecHead";
import {
  PinnedCard,
  StalePinCard,
  TrackedAgateRow,
  StaleAgateRow,
} from "./PinnedCard";
import { LiveRoom, LiveRoomField } from "./LiveRoom";
import { useIsNative } from "../dev/native-detect";
import { buildWatchingMeta } from "./watching-data";
import type { PinnedItem, WatchingPayload } from "./watching-data";

// List of pinned games. Live first, then upcoming, then final. Stale pins
// (games we can't resolve from the feed or snapshots) appear at the
// bottom with their own remove action so the list never feels broken.

/** State-aware summary sentence under the "Watching." display (DESKTOP).
 *  Live > upcoming > final > unresolved priority — never reveals
 *  winners or margins, just timing-of-tracking copy. Safe under
 *  No-Spoilers. Mirrors the status buckets used by the Today brief
 *  via PinnedSummary so the two surfaces always agree. Mobile uses the
 *  mono pagehead meta (buildWatchingMeta) instead. */
function buildWatchingSummary(
  items: PinnedItem[],
  staleCount: number
): string {
  const live = items.filter((i) => i.status === "live").length;
  const upcoming = items.filter((i) => i.status === "upcoming").length;
  const final = items.filter((i) => i.status === "final").length;

  if (items.length === 0) {
    // No resolved tracked items — everything is either still loading or
    // truly unresolved. If we have stale pins, surface the
    // unavailable copy (lets the user know they can remove from below).
    // Without any stale pins either, the page shouldn't even be
    // rendering — fall back to neutral copy as a defensive default.
    if (staleCount > 0) {
      return staleCount === 1
        ? "Tracked game unavailable."
        : `${staleCount} tracked games unavailable.`;
    }
    return "One game tracked.";
  }

  if (live > 0) {
    return live === 1 ? "Live now." : `${live} games live.`;
  }
  if (upcoming > 0 && final === 0) {
    return upcoming === 1
      ? "Tracked for later."
      : `${upcoming} games tracked for later.`;
  }
  if (final > 0 && upcoming === 0) {
    return final === 1 ? "Wrapped." : "All wrapped.";
  }
  // Mixed upcoming + final, no live
  return `${upcoming} coming up · ${final} wrapped.`;
}

export function WatchingDashboard({ payload }: { payload: WatchingPayload }) {
  return (
    <section>
      {/* Mobile: System D recomposition — ink Live Room, agate tracked list */}
      <div className="md:hidden">
        <WatchingMobile payload={payload} />
      </div>

      {/* Desktop: legacy card layout, unchanged until D4 unifies desktop */}
      <div className="hidden md:block">
        <WatchingDesktop payload={payload} />
      </div>
    </section>
  );
}

// ── Mobile (System D) ──────────────────────────────────────────────────

function WatchingMobile({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins, liveCount } = payload;
  const native = useIsNative();
  const meta = buildWatchingMeta(items, stalePins.length);

  // Live Room gate is unchanged from the dock: ≥2 live pins. Non-dock pins
  // (non-live when the room is on, else every pin) fall to the TRACKED list.
  const liveRoomMode = liveCount >= 2;
  const restItems = liveRoomMode ? items.filter((i) => i.status !== "live") : items;

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

      {/* Live Room ink field — self-gates to nothing below 2 live pins */}
      <LiveRoomField payload={payload} />

      {/* Tracked for later — the non-dock pins as agate rows */}
      {restItems.length > 0 ? (
        <section className="mt-2">
          <SecHead name="Tracked for later" count={String(restItems.length)} />
          {restItems.map((item, i) => (
            <TrackedAgateRow
              key={item.id}
              item={item}
              idx={String(i + 1).padStart(2, "0")}
            />
          ))}
        </section>
      ) : null}

      {/* Track more — a calm persistent affordance back to Following */}
      <Link
        href="/following"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--mute-1)",
        }}
        aria-label="Track more games. Go to Following."
      >
        Track more from Following
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

// ── Desktop (legacy, unchanged until D4) ───────────────────────────────

function WatchingDesktop({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins, liveCount } = payload;
  const hasLivePin = liveCount > 0;
  const native = useIsNative();
  // Live Room mode: ≥2 pins live. The dock takes the top of the screen
  // and the regular roster below shows the non-live pins so the user
  // can still see what's queued / wrapped.
  const liveRoomMode = liveCount >= 2;
  const restItems = liveRoomMode
    ? items.filter((i) => i.status !== "live")
    : items;

  return (
    <>
      <Display as="h1" size="lg" className="mb-2">
        Watching.
      </Display>
      <p
        className="mb-4 flex items-center gap-2 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {/* Live pulse — pulsing accent dot when at least one pin is live.
            Sits inline with the summary line so the screen visibly
            "breathes" during a live game without adding new chrome. */}
        {hasLivePin ? (
          <span
            aria-hidden
            className="no-noise-live-fade inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--live)" }}
          />
        ) : null}
        <span>{buildWatchingSummary(items, stalePins.length)}</span>
      </p>

      {/* Live-tracking status — only on native (lock screen exists there)
          and only when something's live. Caps the display at 3 since the
          app tracks at most 3 Live Activities at once. */}
      {native && hasLivePin ? (
        <p
          className="mb-4 -mt-2 text-[12px]"
          style={{
            color: "var(--mute-1)",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          On your lock screen: {Math.min(liveCount, 3)} of 3 · remove a game below to stop
        </p>
      ) : null}

      {/* ── Live Room dock (Stage 15E) — only when ≥2 live pins ─────── */}
      {liveRoomMode ? <LiveRoom payload={payload} /> : null}

      {restItems.length > 0 ? (
        <>
          {liveRoomMode ? (
            <div className="mb-2 flex items-center gap-3">
              <Eyebrow>Also tracked</Eyebrow>
              <div className="h-px flex-1" style={{ background: "var(--line)" }} />
            </div>
          ) : null}
          {/* Stack on mobile; 2-up on md+ when there are 2+ cards so
              desktop visitors aren't stuck with a tall single column.
              Single-card case stays single-column to preserve the
              "this one game" focus on wider widths too. */}
          <ul
            className={
              restItems.length >= 2
                ? "grid gap-2 md:grid-cols-2"
                : "space-y-2"
            }
          >
            {restItems.map((item) => (
              <li key={item.id}>
                <PinnedCard item={item} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Quiet nudge to track more when the list is thin (1–2 pins). Was a
          full dashed box, but next to a single tracked card it competed
          with the content at equal weight. Demoted to a calm muted link so
          the affordance stays without shouting. At 3+ pins it's hidden. */}
      {items.length > 0 && items.length < 3 ? (
        <Link
          href="/following"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] transition active:scale-[0.99]"
          style={{ color: "var(--mute-1)", fontWeight: 600 }}
          aria-label="Track more games. Go to Following."
        >
          Track more from Following
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      {stalePins.length > 0 ? (
        <div className="mt-5">
          <Eyebrow>Archived</Eyebrow>
          <p
            className="mt-1 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            These games are no longer in the live feed. You can remove
            them below.
          </p>
          <ul className="mt-2 space-y-2">
            {stalePins.map((pin) => (
              <li key={pin.id}>
                <StalePinCard pin={pin} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
