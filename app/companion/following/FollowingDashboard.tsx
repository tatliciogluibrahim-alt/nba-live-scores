"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Display } from "../atoms/Display";
import { Masthead } from "../system/Masthead";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import type { Follow } from "../state/types";
import { type FollowCardData } from "./FollowCard";
import { FollowRow } from "./FollowRow";
import { buildFollowingView } from "./following-view";
import { useWrappedSeries, NBA_PLAYOFFS_WRAPPED } from "./use-wrapped-series";
import { tournamentPhase } from "./data/tournament-phase";
import { useLiveFollows, isFollowLive } from "./use-live-follows";
import { SportsCircleShareModal } from "../share/SportsCircleShareModal";
import { SyncCircleModal } from "./SyncCircleModal";
import { FirstFollowTierCard } from "../follow/FirstFollowTierCard";
import { TierLegend } from "./TierLegend";
import { readLegendSeen, writeLegendSeen } from "./tier-legend-storage";

// Stable no-op subscriber for useSyncExternalStore. localStorage has no
// observable events; the legend-seen flag is read once per mount.
function legendStorageSubscribe() {
  return () => {};
}

/** Detect "overlapping" follow combinations — these aren't bugs but
 *  they raise the "am I getting two notifications per event?" worry.
 *  The dispatcher's per-(endpoint, event-tag) dedupe guarantees one
 *  push per event regardless of how many of your follows matched it.
 *  We surface a single calm one-liner when overlap is present so the
 *  user knows. Cases that count as overlap:
 *
 *   • Any tournament follow paired with any other kind. (Tournament
 *     follows are the broadest — every team / country / series event
 *     in that tournament is double-covered.)
 *   • A series follow whose two teams are both also followed (or
 *     either is also team-followed). Each game in the series matches
 *     both the series follow and the team follow.
 */
function hasOverlappingFollows(follows: Follow[]): boolean {
  const tournaments = follows.filter((f) => f.kind === "tournament");
  const otherKinds = follows.filter((f) => f.kind !== "tournament");

  // Tournament + anything else is the simplest overlap.
  if (tournaments.length > 0 && otherKinds.length > 0) return true;

  // Series + matching team(s).
  const teamIds = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  for (const f of follows) {
    if (f.kind !== "series") continue;
    const [a, b] = f.id.split("-");
    if ((a && teamIds.has(a)) || (b && teamIds.has(b))) return true;
  }

  return false;
}

// Following dashboard — the sports circle. One System D composition per
// width behind the md seam: the mobile agate column (FollowingMobile) and
// the desktop broadsheet (FollowingDesktop), both bucketed from the SAME
// buildFollowingView + tier-stamped FollowRows.

export function FollowingDashboard() {
  const { follows, alertSlotCount, alertSlotCap } = useFollows();
  const [shareOpen, setShareOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  // Wrapped-series detection. Series follows whose underlying playoff
  // matchup is over render with a calm "Wrapped" chip — the user
  // still owns the follow (in case they want to look back at the
  // series detail), but the card signals it won't drive new alerts.
  const wrappedSeries = useWrappedSeries();
  const liveFollows = useLiveFollows();
  // Surface the bracket entry only for people who follow the World Cup
  // (a country or the tournament). It's a destination link, not IA.
  const followsWC = follows.some(
    (f) =>
      f.kind === "country" ||
      (f.kind === "tournament" && f.id.startsWith("fifa-world-cup"))
  );

  const cards: FollowCardData[] = follows.map((f) => {
    const identity = resolveFollowIdentity(f);
    return {
      follow: f,
      kindLabel: identity.kindLabel,
      identityMark: identity.chip,
      name: identity.name,
      detail: identity.detail,
      accent: identity.accent,
      // Wrapped covers two cases now: a wrapped SERIES, and a wrapped
      // TOURNAMENT (NBA playoffs) once the Finals are decided. Without
      // the tournament case, a finished playoffs run stayed under UP NEXT
      // because buildFollowingView only routes `wrapped` cards to WRAPPED.
      wrapped:
        (f.kind === "series" && wrappedSeries.has(f.id)) ||
        // A tournament is wrapped once its lifecycle phase is "concluded"
        // (robust through the offseason — the WC after the final, the NBA
        // playoffs after the season year), OR the moment the Finals series
        // wraps in the live feed (so it flips immediately, before the
        // July-1 offseason boundary the phase uses).
        (f.kind === "tournament" &&
          (tournamentPhase(f.id) === "concluded" ||
            (f.id.startsWith("nba-playoffs") &&
              wrappedSeries.has(NBA_PLAYOFFS_WRAPPED)))),
      isLive: isFollowLive(f.kind, f.id, liveFollows),
    };
  });

  // Wrapped follows that still have their alert toggle on are holding a
  // scarce free-tier slot they can never spend — a wrapped season fires
  // no more alerts. We don't silently flip the toggle; instead we point
  // it out so the user can free the slot for something live.
  const wrappedHoldingSlot = cards.filter(
    (c) => c.wrapped && c.follow.alertEnabled
  );

  return (
    <>
      {/* ── Mobile: System D recomposition (D3). Masthead chrome, display
          pagehead, the ONE cross-link ink band, tier-stamped agate rows. */}
      <div className="md:hidden">
        <FollowingMobile
          follows={follows}
          cards={cards}
          alertSlotCount={alertSlotCount}
          alertSlotCap={alertSlotCap}
          followsWC={followsWC}
          wrappedHoldingSlot={wrappedHoldingSlot}
          onShare={() => setShareOpen(true)}
          onSync={() => setSyncOpen(true)}
        />
      </div>

      {/* ── Desktop: System D broadsheet (D4b). The same registers as the
          mobile column at the wide main measure — Masthead full width,
          "Your sports circle." pagehead, the ONE cross-link ink band,
          tier-stamped FollowRows in LIVE NOW / UP NEXT / WRAPPED. ──────── */}
      <div className="hidden md:block">
        <FollowingDesktop
          follows={follows}
          cards={cards}
          alertSlotCount={alertSlotCount}
          alertSlotCap={alertSlotCap}
          followsWC={followsWC}
          wrappedHoldingSlot={wrappedHoldingSlot}
          onShare={() => setShareOpen(true)}
          onSync={() => setSyncOpen(true)}
        />
      </div>

      {/* Modals — shared by both branches (fixed overlays; layout-neutral). */}
      {shareOpen ? (
        <SportsCircleShareModal
          follows={follows}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {syncOpen ? (
        <SyncCircleModal follows={follows} onClose={() => setSyncOpen(false)} />
      ) : null}
    </>
  );
}

// ── Mobile (System D, D3) ───────────────────────────────────────────────
//
// The agate recomposition per docs/superpowers/design-directions/d-following.
// Order: Masthead → "Your sports circle." pagehead → count meta + the
// free-alerts why-line → (edge-case mono nudges) → the ONE cross-link ink
// band (live only) → LIVE NOW / UP NEXT / WRAPPED sections of tier-stamped
// FollowRows → the per-sport bracket cross-link → Add follow → SHARE · SYNC
// DEVICES footer. The tier legend + "?" affordance land in Task 3.

const MOBILE_META_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
} as const;

function FollowingMobile({
  follows,
  cards,
  alertSlotCount,
  alertSlotCap,
  followsWC,
  wrappedHoldingSlot,
  onShare,
  onSync,
}: {
  follows: Follow[];
  cards: FollowCardData[];
  alertSlotCount: number;
  alertSlotCap: number;
  followsWC: boolean;
  wrappedHoldingSlot: FollowCardData[];
  onShare: () => void;
  onSync: () => void;
}) {
  const { liveNow, upNext, wrapped } = buildFollowingView(cards);
  // Which rows are expanded. Lifted here so the mobile column owns it; each
  // FollowRow is a controlled expander (its drawer is the shared FollowCard
  // panel). Independent per row (not an accordion) to match FollowCard.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const keyOf = (c: FollowCardData) => `${c.follow.kind}-${c.follow.id}`;
  const toggle = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Tier legend visibility — lint-compliant SSR-safe approach:
  //   useSyncExternalStore reads localStorage on the client and returns the
  //   server snapshot (false = never seen → show) during SSR. If snapshots
  //   differ after hydration, React remounts to sync. No useEffect needed.
  const legendSeenInStorage = useSyncExternalStore(
    legendStorageSubscribe,
    () => readLegendSeen(), // client snapshot
    () => false             // server snapshot: never seen → show legend
  );
  // Within-session override flags: dismiss hides, re-open shows.
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [reopenedThisSession, setReopenedThisSession] = useState(false);
  const legendOpen =
    (!legendSeenInStorage && !dismissedThisSession) || reopenedThisSession;

  function handleLegendDismiss() {
    writeLegendSeen();
    setDismissedThisSession(true);
    setReopenedThisSession(false);
  }

  function handleLegendReopen() {
    setReopenedThisSession(true);
  }

  // Which section head hosts the "?" and the legend panel — the first
  // non-empty tier-stamped section (LIVE NOW > UP NEXT > WRAPPED).
  const firstKey: "live" | "next" | "wrapped" | null =
    liveNow.length > 0 ? "live" : upNext.length > 0 ? "next" : wrapped.length > 0 ? "wrapped" : null;

  const followCount = follows.length;
  const countLine = `${followCount} ${followCount === 1 ? "follow" : "follows"} · ${alertSlotCount} of ${alertSlotCap} alert slots used`;

  const overlap = hasOverlappingFollows(follows);

  function renderSection(
    label: string,
    items: FollowCardData[],
    sectionKey: "live" | "next" | "wrapped"
  ) {
    if (items.length === 0) return null;
    const isFirst = sectionKey === firstKey;

    // UP NEXT → sage plate, WRAPPED → blush plate, LIVE NOW → no plate (cream).
    // Full-bleed: -mx-4 bleeds to screen edges; inner px-4 realigns content.
    // Padding matches c4 mock (.sec = 18px 18px 6px).
    const plateBg =
      sectionKey === "next"
        ? "var(--plate-next)"
        : sectionKey === "wrapped"
        ? "var(--plate-wrap)"
        : null;

    const inner = (
      <>
        <SecHead
          name={label}
          count={String(items.length)}
          onHelp={isFirst ? handleLegendReopen : undefined}
        />
        {/* Tier legend — only under the first populated section head. */}
        {isFirst && (
          <TierLegend visible={legendOpen} onDismiss={handleLegendDismiss} />
        )}
        {items.map((c) => {
          const key = keyOf(c);
          return (
            <FollowRow
              key={key}
              data={c}
              expanded={expandedKeys.has(key)}
              onToggleExpand={() => toggle(key)}
            />
          );
        })}
      </>
    );

    if (plateBg) {
      return (
        <section className="mt-6 -mx-4" style={{ background: plateBg }}>
          <div className="px-4 pt-[18px] pb-[6px]">{inner}</div>
        </section>
      );
    }

    return <section className="mt-6">{inner}</section>;
  }

  return (
    <section>
      {/* Masthead — the broadsheet nameplate. -mx-4 bleeds the 2px rule to
          the screen edges within the page's px-4 gutter. Live count derives
          from the follow cards' live status (the same signal LIVE NOW uses). */}
      <div className="-mx-4 mb-5">
        <Masthead liveCount={liveNow.length} />
      </div>

      <Display
        as="h1"
        size="lg"
        style={{
          fontWeight: 800,
          fontSize: "31px",
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        Your sports circle.
      </Display>

      <p
        className="mt-2 uppercase tabular-nums lining-nums"
        style={{ ...MOBILE_META_STYLE, color: "var(--mute-1)" }}
      >
        {countLine}
      </p>
      <p
        className="mt-[3px] uppercase"
        style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
      >
        Alerts on your first 3 follows are free
      </p>

      {/* Wrapped-slot nudge — a wrapped season can't fire alerts, so its
          slot is dead weight. Mono/muted line, no box (restyle-light). */}
      {wrappedHoldingSlot.length > 0 ? (
        <p
          className="mt-2 uppercase"
          style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
        >
          {wrappedHoldingSlot.length === 1
            ? `${wrappedHoldingSlot[0].name} wrapped. Turn its alerts off to free a slot.`
            : "Some wrapped follows hold alert slots. Turn them off to free them."}
        </p>
      ) : null}

      {/* Overlap hint — one push per event even when follows overlap. */}
      {overlap ? (
        <p
          className="mt-2 uppercase"
          style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
        >
          Some overlap. You still get one alert per event.
        </p>
      ) : null}

      {/* First-follow tier education — self-gates to the first follow. */}
      <div className="mt-4">
        <FirstFollowTierCard />
      </div>

      {/* The ONE ink band (spec §6): a calm cross-link to Watching, the live
          surface. Only when a followed game is live. Inset like the sections
          (not edge-bleeding) per the mock. */}
      {liveNow.length > 0 ? (
        <Link
          href="/watching"
          aria-label={`${liveNow.length} live now. Open Watching.`}
          className="mt-[18px] flex items-center gap-[9px] transition active:opacity-90"
          style={{
            background: "var(--ink-field-bg)",
            color: "var(--cream-on-ink)",
            padding: "13px 14px",
          }}
        >
          <span
            aria-hidden
            className="no-noise-live-fade inline-block shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: "var(--cream-on-ink)" }}
          />
          <span
            className="flex-1 uppercase tabular-nums lining-nums"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {liveNow.length} LIVE NOW
          </span>
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--cream-on-ink-dim)",
            }}
          >
            OPEN WATCHING →
          </span>
        </Link>
      ) : null}

      {renderSection("Live now", liveNow, "live")}
      {renderSection("Up next", upNext, "next")}
      {renderSection("Wrapped", wrapped, "wrapped")}

      {/* Per-sport cross-link — the bracket destination, WC followers only. */}
      {followsWC ? (
        <section className="mt-6">
          <SecHead name="Summer soccer" />
          <AgateRow
            main="View the bracket"
            note="See who's through, round by round"
            href="/tournament/fifa-world-cup-2026/bracket"
          />
        </section>
      ) : null}

      {/* Add follow — the primary action, filled pill. Then the SHARE ·
          SYNC DEVICES footer wiring the existing two modals. */}
      <div className="mt-[26px]">
        <Link
          href="/following/add"
          aria-label="Follow more (NBA Playoffs or Summer Soccer)"
          className="flex w-full items-center justify-center rounded-full transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            fontSize: 15,
            fontWeight: 600,
            padding: 14,
          }}
        >
          Add follow
        </Link>

        <div
          className="mt-4 flex justify-center gap-[26px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--mute-1)",
          }}
        >
          {follows.length > 0 ? (
            <button
              type="button"
              onClick={onShare}
              aria-label="Share your sports circle as an image"
              className="underline transition active:opacity-70"
              style={{
                textUnderlineOffset: 3,
                textDecorationColor: "var(--line)",
              }}
            >
              Share
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            aria-label="Sync your follows across devices with a code"
            className="underline transition active:opacity-70"
            style={{
              textUnderlineOffset: 3,
              textDecorationColor: "var(--line)",
            }}
          >
            Sync devices
          </button>
          {/* Settings — the D3 recomposition dropped the legacy pagehead
              gear; the entry point lives here now (founder call
              2026-07-03: with the other utility links, not app chrome). */}
          <Link
            href="/settings"
            aria-label="Alerts and notification settings"
            className="underline transition active:opacity-70"
            style={{
              textUnderlineOffset: 3,
              textDecorationColor: "var(--line)",
            }}
          >
            Settings
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Desktop (System D, D4b) ──────────────────────────────────────────────
//
// The broadsheet at the wide main measure. Same order and registers as the
// mobile column — Masthead → "Your sports circle." pagehead → count + free-
// alerts meta → (edge-case mono nudges) → the ONE cross-link ink band (live
// only) → LIVE NOW / UP NEXT / WRAPPED tier-stamped FollowRows → bracket
// cross-link → Add follow → SHARE · SYNC DEVICES · SETTINGS — bucketed from
// the SAME buildFollowingView so the two widths can never drift. Difference
// from mobile: content sits in an 18px editorial gutter (the D4b desktop
// inset, matching Today), plate tints bleed to the content-box edge, and the
// Masthead rule spans the full measure.
//
// Legend visibility + row-expansion state are owned here (a second copy of
// the mobile column's local state). Both branches mount, but only one is
// visible per viewport, so there's no cross-talk; the legend-seen flag
// persists through localStorage either way.

function FollowingDesktop({
  follows,
  cards,
  alertSlotCount,
  alertSlotCap,
  followsWC,
  wrappedHoldingSlot,
  onShare,
  onSync,
}: {
  follows: Follow[];
  cards: FollowCardData[];
  alertSlotCount: number;
  alertSlotCap: number;
  followsWC: boolean;
  wrappedHoldingSlot: FollowCardData[];
  onShare: () => void;
  onSync: () => void;
}) {
  const { liveNow, upNext, wrapped } = buildFollowingView(cards);

  // Row expansion — each FollowRow is an independent controlled expander
  // opening the shared FollowDrawerBody (bell + tier + per-follow No-Spoilers
  // + unfollow). Not an accordion.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const keyOf = (c: FollowCardData) => `${c.follow.kind}-${c.follow.id}`;
  const toggle = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Tier legend visibility — the same SSR-safe useSyncExternalStore read the
  // mobile column uses (server snapshot false = never seen → show).
  const legendSeenInStorage = useSyncExternalStore(
    legendStorageSubscribe,
    () => readLegendSeen(),
    () => false
  );
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [reopenedThisSession, setReopenedThisSession] = useState(false);
  const legendOpen =
    (!legendSeenInStorage && !dismissedThisSession) || reopenedThisSession;

  function handleLegendDismiss() {
    writeLegendSeen();
    setDismissedThisSession(true);
    setReopenedThisSession(false);
  }

  function handleLegendReopen() {
    setReopenedThisSession(true);
  }

  const firstKey: "live" | "next" | "wrapped" | null =
    liveNow.length > 0 ? "live" : upNext.length > 0 ? "next" : wrapped.length > 0 ? "wrapped" : null;

  const followCount = follows.length;
  const countLine = `${followCount} ${followCount === 1 ? "follow" : "follows"} · ${alertSlotCount} of ${alertSlotCap} alert slots used`;
  const overlap = hasOverlappingFollows(follows);

  function renderSection(
    label: string,
    items: FollowCardData[],
    sectionKey: "live" | "next" | "wrapped"
  ) {
    if (items.length === 0) return null;
    const isFirst = sectionKey === firstKey;

    // UP NEXT → sage plate, WRAPPED → blush plate, LIVE NOW → no plate (cream).
    // The plate tint bleeds out of the 18px gutter (-mx-[18px]) to the content-
    // box edge and pads back in, so rows stay aligned with the ungated LIVE NOW
    // rows and the pagehead — the desktop echo of the mobile -mx-4/px-4 bleed.
    const plateBg =
      sectionKey === "next"
        ? "var(--plate-next)"
        : sectionKey === "wrapped"
        ? "var(--plate-wrap)"
        : null;

    const inner = (
      <>
        <SecHead
          name={label}
          count={String(items.length)}
          onHelp={isFirst ? handleLegendReopen : undefined}
        />
        {isFirst && (
          <TierLegend visible={legendOpen} onDismiss={handleLegendDismiss} />
        )}
        {items.map((c) => {
          const key = keyOf(c);
          return (
            <FollowRow
              key={key}
              data={c}
              expanded={expandedKeys.has(key)}
              onToggleExpand={() => toggle(key)}
            />
          );
        })}
      </>
    );

    if (plateBg) {
      return (
        <section className="mt-6 -mx-[18px]" style={{ background: plateBg }}>
          <div className="px-[18px] pt-[18px] pb-[6px]">{inner}</div>
        </section>
      );
    }

    return <section className="mt-6">{inner}</section>;
  }

  return (
    <section>
      {/* Masthead — full-width broadsheet nameplate; the 2px rule spans the
          content measure (mx-0, the D4b desktop treatment Today uses). */}
      <div className="mb-5">
        <Masthead liveCount={liveNow.length} />
      </div>

      {/* 18px editorial gutter — every non-plate block sits here; plates
          bleed out of it and pad back to stay aligned. */}
      <div className="px-[18px]">
        <Display
          as="h1"
          size="lg"
          style={{
            fontWeight: 800,
            fontSize: "31px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Your sports circle.
        </Display>

        <p
          className="mt-2 uppercase tabular-nums lining-nums"
          style={{ ...MOBILE_META_STYLE, color: "var(--mute-1)" }}
        >
          {countLine}
        </p>
        <p
          className="mt-[3px] uppercase"
          style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
        >
          Alerts on your first 3 follows are free
        </p>

        {/* Wrapped-slot nudge — a wrapped season can't fire alerts. */}
        {wrappedHoldingSlot.length > 0 ? (
          <p
            className="mt-2 uppercase"
            style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
          >
            {wrappedHoldingSlot.length === 1
              ? `${wrappedHoldingSlot[0].name} wrapped. Turn its alerts off to free a slot.`
              : "Some wrapped follows hold alert slots. Turn them off to free them."}
          </p>
        ) : null}

        {/* Overlap hint — one push per event even when follows overlap. */}
        {overlap ? (
          <p
            className="mt-2 uppercase"
            style={{ ...MOBILE_META_STYLE, color: "var(--mute-2)" }}
          >
            Some overlap. You still get one alert per event.
          </p>
        ) : null}

        {/* First-follow tier education — self-gates to the first follow. */}
        <div className="mt-4">
          <FirstFollowTierCard />
        </div>

        {/* The ONE ink band — a calm cross-link to Watching, live only. */}
        {liveNow.length > 0 ? (
          <Link
            href="/watching"
            aria-label={`${liveNow.length} live now. Open Watching.`}
            className="mt-[18px] flex items-center gap-[9px] transition active:opacity-90"
            style={{
              background: "var(--ink-field-bg)",
              color: "var(--cream-on-ink)",
              padding: "13px 14px",
            }}
          >
            <span
              aria-hidden
              className="no-noise-live-fade inline-block shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: "var(--cream-on-ink)" }}
            />
            <span
              className="flex-1 uppercase tabular-nums lining-nums"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              {liveNow.length} LIVE NOW
            </span>
            <span
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--cream-on-ink-dim)",
              }}
            >
              OPEN WATCHING →
            </span>
          </Link>
        ) : null}

        {renderSection("Live now", liveNow, "live")}
        {renderSection("Up next", upNext, "next")}
        {renderSection("Wrapped", wrapped, "wrapped")}

        {/* Per-sport cross-link — the bracket destination, WC followers only. */}
        {followsWC ? (
          <section className="mt-6">
            <SecHead name="Summer soccer" />
            <AgateRow
              main="View the bracket"
              note="See who's through, round by round"
              href="/tournament/fifa-world-cup-2026/bracket"
            />
          </section>
        ) : null}

        {/* Add follow — the primary action, filled pill. Then the SHARE ·
            SYNC DEVICES · SETTINGS footer wiring the existing two modals. */}
        <div className="mt-[26px]">
          <Link
            href="/following/add"
            aria-label="Follow more (NBA Playoffs or Summer Soccer)"
            className="flex w-full items-center justify-center rounded-full transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              fontSize: 15,
              fontWeight: 600,
              padding: 14,
            }}
          >
            Add follow
          </Link>

          <div
            className="mt-4 flex justify-center gap-[26px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--mute-1)",
            }}
          >
            {follows.length > 0 ? (
              <button
                type="button"
                onClick={onShare}
                aria-label="Share your sports circle as an image"
                className="underline transition active:opacity-70"
                style={{
                  textUnderlineOffset: 3,
                  textDecorationColor: "var(--line)",
                }}
              >
                Share
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSync}
              aria-label="Sync your follows across devices with a code"
              className="underline transition active:opacity-70"
              style={{
                textUnderlineOffset: 3,
                textDecorationColor: "var(--line)",
              }}
            >
              Sync devices
            </button>
            <Link
              href="/settings"
              aria-label="Alerts and notification settings"
              className="underline transition active:opacity-70"
              style={{
                textUnderlineOffset: 3,
                textDecorationColor: "var(--line)",
              }}
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
