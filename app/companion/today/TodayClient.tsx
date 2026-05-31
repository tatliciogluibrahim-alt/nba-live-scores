"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PullToRefresh } from "../atoms/PullToRefresh";
import { BrandMark } from "../frame/BrandMark";
import { useFollows, useNoSpoilers } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveTodayHeadline } from "./today-data";
import { FrontPageLead } from "./FrontPageLead";
import { RestingState } from "./RestingState";
import { EnableNotificationsCard } from "./EnableNotificationsCard";
import { PushPermissionRecoveryCard } from "./PushPermissionRecoveryCard";
import { InstallPromptCard } from "./InstallPromptCard";
import { BriefPromptCard } from "./BriefPromptCard";
import { FirstRunStrip } from "./FirstRunStrip";
import { QuietRecap } from "./QuietRecap";
import { YouFollow } from "./sections/you-follow";
import { UpNext } from "./sections/up-next";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";
import { CalmEndCard } from "./sections/calm-end-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards; passive dot in header
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// No-Spoilers is configured once in Alerts & Notifications (Settings), not toggled
// per-visit. When active, a small muted dot in the Today header confirms
// the mode without demanding interaction. The old inline chip is gone.

export function TodayClient() {
  const { payload, hydrated, updatedAt, refetch } = useTodayData();
  const { follows, removeFollow } = useFollows();

  // Auto-drop a dead series follow when its series wraps. The data layer
  // sets payload.closing.autoDropFollow only for the SERIES follow (team
  // follows are left alone so they can ride into the next round). Frees
  // the alert slot automatically per the Finals-era alerts principles.
  // Guarded by a ref so a re-render doesn't re-attempt after the follow
  // is gone, and only fires if the follow still exists.
  const droppedRef = useRef<Set<string>>(new Set());
  const autoDrop = payload.closing?.autoDropFollow;
  useEffect(() => {
    if (!hydrated || !autoDrop) return;
    if (droppedRef.current.has(autoDrop.id)) return;
    const stillFollowed = follows.some(
      (f) => f.kind === "series" && f.id === autoDrop.id
    );
    if (!stillFollowed) return;
    droppedRef.current.add(autoDrop.id);
    removeFollow("series", autoDrop.id);
  }, [hydrated, autoDrop, follows, removeFollow]);

  // Front Page lead (Concept A) — a punchy state headline + accent
  // eyebrow + a single condensed deck card for the lead game. Replaces
  // the conversational Daily Brief sentence as the editorial top of the
  // screen, and absorbs the live hero (the deck IS the lead game).
  const lead = hydrated ? deriveTodayHeadline(payload) : null;

  return (
    <PullToRefresh onRefresh={refetch}>
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6">
      {/* ── Masthead (Concept A "Front Page"): date · No Noise wordmark ·
          No-Spoilers state, with a full-width hairline beneath. The big
          "Today" title is gone — the Brief headline below is the page's
          dominant type ("one headline a day"). Stable sr-only h1 keeps
          the landmark. The centered wordmark is mobile-only; on desktop
          the sidebar already carries the brand. */}
      <h1 className="sr-only">Today</h1>
      <header
        className="-mx-4 mb-5 flex items-center justify-between gap-2 border-b px-4 pb-3"
        style={{
          borderColor: "var(--line)",
          // Reserve the iOS status-bar / Dynamic Island height so the
          // date row doesn't collide with the clock + battery. BrandBar
          // does the same on the other tabs; Today's custom masthead
          // was missing it. 0 on web / non-notch devices.
          paddingTop: "max(env(safe-area-inset-top), 10px)",
        }}
      >
        <p
          className="flex-1 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "var(--mute-1)",
          }}
          aria-label={
            updatedAt
              ? `Today, updated ${updatedAt.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Today"
          }
        >
          {updatedAt
            ? updatedAt.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Today"}
        </p>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <BrandMark size={22} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            No&nbsp;Noise
          </span>
        </div>

        {/* Ambient No-Spoilers indicator — only shown when active.
            Passive status display, not a per-visit toggle (set once in
            Settings; tapping here goes there). */}
        <div className="flex flex-1 justify-end">
          <NoSpoilersAmbientDot />
        </div>
      </header>

      {/* First-run onboarding — the 3-card checklist that shows
          until the user has followed, pinned, and made a notification
          decision. Auto-retires when all three are done. */}
      {hydrated ? <FirstRunStrip /> : null}

      {/* Quiet Recap — end-of-night moment when the slate is fully wrapped.
          Renders above the Brief because it's the one card that earns
          interrupting the normal Today layout. Once-per-night. */}
      {hydrated ? <QuietRecap payload={payload} /> : null}

      {/* Front Page lead — state headline + lead-game deck. On a RESTING
          day (nothing live, games coming up) the calm "Quiet for now."
          state (design C) takes over instead, folding in the Next-up
          list. */}
      {hydrated && payload.restingState ? (
        <RestingState items={payload.upNext} />
      ) : lead ? (
        <FrontPageLead lead={lead} />
      ) : null}

      {/* Calm Ending — series wrapped or season wrapped. Sits above the
          install/notifications cards so the user sees the acknowledgment
          first when they open Today the morning after a clinch. The card
          internally suppresses itself if the user has dismissed this
          specific moment id. */}
      {hydrated && payload.closing ? (
        <div className="mb-4">
          <CalmEndCard moment={payload.closing} />
        </div>
      ) : null}

      {/* Install for game alerts — Phase 9 friend-beta gate. Sits above
          EnableNotificationsCard because on iOS, install is a prerequisite
          for push working at all. Internally bails when running standalone
          or when the user has dismissed. */}
      <InstallPromptCard />

      {/* Enable Notifications — Stage A push pass. Renders below the
          Brief so a fresh-install user sees it without it competing
          with the Brief itself. Internally bails if permission is
          already decided or the user dismissed. */}
      <EnableNotificationsCard />

      {/* Push Permission Recovery — Phase 21C. Renders only when
          permission is "denied" AND the user has follows worth
          recovering. Mutually exclusive with EnableNotificationsCard
          (that one renders for "default"). One dismissal is permanent. */}
      <PushPermissionRecoveryCard />

      {/* Loading shell — keep the page shape, fill with calm placeholder */}
      {!hydrated ? <LoadingShell /> : null}

      {/* North Star content (with No-Spoilers variant baked into sections).
          Mobile: single-column stack, YouFollow inline between hero and
          UpNext (current behavior). Desktop (md+): YouFollow moves to a
          sticky right rail so the eye stays on the live hero + what's
          next, and the circle is always visible. Phase 22.5-D. */}
      {hydrated ? (
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_280px] md:gap-6">
          <div className="space-y-5">
            {/* The lead game is now the Front Page deck above; the old
                WorthCheckingNow hero would just duplicate it. */}

            {/* YouFollow appears here on mobile only — at md+ the sticky
                aside in the right rail takes over. */}
            <div className="md:hidden">
              <YouFollow items={payload.youFollow} />
            </div>

            {/* On a resting day the Next-up list is shown inside
                RestingState above, so skip the standalone section to
                avoid a duplicate "Upcoming" list. */}
            {!payload.restingState ? (
              <UpNext items={payload.upNext} />
            ) : null}

            <QuietWrap items={payload.quietWrap} />

            {payload.reminder ? <ReminderRow reminder={payload.reminder} /> : null}

            {/* Quiet-day payoff: when nothing's live, nothing's next, nothing
                just wrapped — and the reminder isn't already filling the page. */}
            {payload.isQuietDay && !payload.reminder ? <CalmCard /> : null}

            {/* One-time, dismissible nudge to the Daily Brief email. Sits
                at the bottom so it never competes with the live slate. */}
            <BriefPromptCard />
          </div>

          {/* Desktop-only sticky right rail. Renders YouFollow so the
              user's sports circle is always in view while they scan
              hero / up-next. The sticky offset is small (16px) so the
              rail tracks the scroll without crowding the top edge. */}
          <aside className="hidden md:block">
            <div className="sticky top-4">
              <YouFollow items={payload.youFollow} />
            </div>
          </aside>
        </div>
      ) : null}
    </main>
    </PullToRefresh>
  );
}

// ── Ambient No-Spoilers indicator ─────────────────────────────────────
// Passive status dot. Only renders when No-Spoilers is on — its absence
// is the signal that scores are visible, so there's nothing to show when
// the mode is off. Tapping takes you to Alerts & Notifications to change it.
// Deliberately low visual weight: muted color, small type, no border,
// no filled background. The app should not prompt a scores decision
// every time Today opens.

function NoSpoilersAmbientDot() {
  const noSpoilers = useNoSpoilers();
  if (!noSpoilers) return null;

  return (
    <Link
      href="/settings"
      aria-label="Scores hidden. Open Alerts & Notifications to change."
      className="no-noise-reveal-focus inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 transition active:scale-[0.97]"
      style={{ color: "var(--mute-1)" }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--mute-2)" }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          // Aligned to canonical Eyebrow letter-spacing (0.12em) so
          // every caps-mono micro-label on Today reads as one
          // consistent system, not two different styles.
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        No-spoilers
      </span>
    </Link>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy>
      <div
        className="no-noise-pulse h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="no-noise-pulse h-[48px] rounded-[14px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          animationDelay: "0.15s",
        }}
      />
      <div
        className="no-noise-pulse h-[68px] rounded-[14px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          animationDelay: "0.3s",
        }}
      />
      <span className="sr-only">Loading Today</span>
    </div>
  );
}
