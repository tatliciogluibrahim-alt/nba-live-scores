"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PullToRefresh } from "../atoms/PullToRefresh";
import { Masthead } from "../system/Masthead";
import { SecHead } from "../system/SecHead";
import { useFollows, useNoSpoilers } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveTodayHeadline } from "./today-data";
import { FrontPageLead } from "./FrontPageLead";
import { LiveTrackHint } from "./LiveTrackHint";
import { AlsoLiveBand, bandShownCount } from "./AlsoLiveBand";
import { FollowLine } from "./FollowLine";
import { slateStartIndex, upNextCountLabel } from "./agate-slate";
import { RestingState } from "./RestingState";
import { BriefPromptCard } from "./BriefPromptCard";
import { useSetupStep } from "./setup/useSetupStep";
import { SetupCard } from "./setup/SetupCard";
import { FirstFollowTierCard } from "../follow/FirstFollowTierCard";
import { QuietRecap } from "./QuietRecap";
import { YouFollow } from "./sections/you-follow";
import { TheMargin } from "./sections/the-margin";
import { UpNext, UP_NEXT_MAX_ROWS } from "./sections/up-next";
import { NextPointer } from "./sections/next-pointer";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";
import { CalmEndCard } from "./sections/calm-end-card";
import { RelianceCard } from "./sections/reliance-card";
import { KnockoutMomentCard } from "./sections/knockout-moment-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards; passive dot in header
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// No-Spoilers is configured once in Alerts & Notifications (Settings), not toggled
// per-visit. When active, a small muted dot in the Today header confirms
// the mode without demanding interaction. The old inline chip is gone.

export function TodayClient() {
  const { payload, hydrated, refetch } = useTodayData();
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

  // Front Page lead — the lead Monument (a live/upcoming game rendered as
  // broadsheet type) or the calm resting headline. It absorbs the live hero
  // (the Monument IS the lead game).
  const lead = hydrated ? deriveTodayHeadline(payload) : null;
  // The day's live+upcoming-today tiles. The ALSO LIVE ink band carries every
  // OTHER live followed game as board rows beneath the lead Monument (a single
  // hero can't represent a multi-live slate on its own). liveCount drives the
  // Masthead "N LIVE →". At md+ the same band carries the multi-live slate the
  // retired DesktopScoreboard grid used to.
  const scoreboard = hydrated ? payload.scoreboard : [];
  const liveCount = scoreboard.filter((t) => t.status === "live").length;

  // ── System D agate-slate index continuation (Task 8, all widths in D4b) ──
  // The lead Monument is 01 and the ALSO LIVE band carries 02..0N; the slate
  // sections below (UP NEXT, then QUIET WRAP) continue the SAME running
  // ordinal so the whole main column reads as one numbered slate (see
  // docs/superpowers/design-directions/d-mix). `leadHasMonument` mirrors
  // FrontPageLead's Monument branch (game && deck); only then does an "01"
  // render.
  const leadHasMonument = Boolean(lead?.game && lead?.deck);
  const bandCount = hydrated
    ? bandShownCount(scoreboard, lead?.game?.gameId)
    : 0;
  const slateStart = slateStartIndex(leadHasMonument, bandCount);
  // UP NEXT renders (and consumes indices) only when it isn't folded into the
  // resting state; QUIET WRAP picks up right after whatever UP NEXT showed.
  // ── Today slim (S1, 2026-07-06): today + exactly one pointer ──
  // UP NEXT holds TODAY'S games only; the week lives on the Schedule tab.
  // When nothing of yours is on today (or it all wrapped), a single NEXT
  // pointer row answers "when do I next care" — never a second future item.
  const todayUpNext = payload.upNext.filter((i) => i.isToday);
  const futureUpNext = payload.upNext.filter((i) => !i.isToday);

  // The Monument renders only for a live lead or today's first game. A
  // future-day lead (pinned Thursday game, quiet Tuesday) is a pointer,
  // not a monument — Today never leads with another day's game.
  const showLead =
    lead != null &&
    (lead.live ||
      (lead.deck != null &&
        todayUpNext.some((i) => i.href === lead.deck?.href)));

  const todayVisible = todayUpNext.filter(
    (i) => !lead?.deck?.href || !showLead || i.href !== lead.deck.href
  );
  const upNextShown = payload.restingState
    ? 0
    : Math.min(todayVisible.length, UP_NEXT_MAX_ROWS);
  const quietWrapStart = slateStart + upNextShown;

  // ── Folded UP NEXT (beta feedback 2026-07-05) ──
  // When the lead Monument is an UPCOMING game it IS today's first up-next
  // match — the SecHead sits above the Monument with the FULL today count,
  // and the agate rows continue headerless right below. Live leads keep the
  // old shape (a live game isn't "up next"; the section below stays honest).
  const foldUpNext =
    leadHasMonument &&
    !payload.restingState &&
    lead != null &&
    !lead.live &&
    showLead &&
    todayUpNext.length > 0 &&
    lead.deck?.href === todayUpNext[0]?.href;

  const showNextPointer =
    !payload.restingState &&
    !lead?.live &&
    todayUpNext.length === 0 &&
    futureUpNext.length > 0;

  const setup = useSetupStep();

  return (
    <PullToRefresh onRefresh={refetch}>
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6 2xl:max-w-7xl">
      {/* ── Masthead. System D broadsheet nameplate at every width (D4b):
          date · BrandMark + "No Noise" wordmark · N LIVE →, the passive
          No-Spoilers dot carried in the right slot. Stable sr-only h1 keeps
          the landmark. On mobile -mx-4 bleeds the 2px vermilion rule to the
          screen edges within the page's px-4 gutter; on desktop mx-0 aligns
          the rule to the content measure so it spans the broadsheet columns
          beneath. The DesktopSidebarNav stays the left-rail chrome. */}
      <h1 className="sr-only">Today</h1>

      <div className="-mx-4 md:mx-0 mb-5">
        <Masthead liveCount={liveCount} rightExtra={<NoSpoilersAmbientDot />} />
      </div>

      {/* Setup — top slot. Only the foundational follow step renders here;
          it is the screen for a brand-new user. Every post-follow nudge
          renders below the content instead (inline slot, further down). */}
      {setup.step === "follow" ? <SetupCard setup={setup} /> : null}

      {/* First-follow alert-tier education — sits below the strip
          (so the user reads "you followed something" before the deep
          explanation), above any other contextual card. The component
          self-gates on follows.length === 1 + !firstFollowEducated,
          so on every other render it's a no-op. */}
      {hydrated ? <FirstFollowTierCard /> : null}

      {/* Quiet Recap — end-of-night moment when the slate is fully wrapped.
          Renders above the Brief because it's the one card that earns
          interrupting the normal Today layout. Once-per-night. */}
      {hydrated ? <QuietRecap payload={payload} /> : null}

      {/* Loading shell — keep the page shape, fill with calm placeholder */}
      {!hydrated ? <LoadingShell /> : null}

      {/* North Star broadsheet (System D, D4b). No-Spoilers behavior is baked
          into each section. Mobile: a single-column stack (the grid collapses
          to a block below md), YOU FOLLOW + The Margin at the foot of the
          slate. Desktop (md+): a two-column broadsheet — the lead Monument +
          ALSO LIVE band + agate slate in the main column, the sports circle
          (YOU FOLLOW) + The Margin in a sticky right rail so the circle stays
          in view while the main column scrolls. */}
      {hydrated ? (
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 md:items-start">
          {/* Main column. The lead / ALSO LIVE / moments carry their own
              vertical margins; the slate below keeps its space-y-5 rhythm. */}
          <div>
            {/* Front Page lead — the lead Monument (the one game worth
                checking now). On a RESTING day (nothing live, games coming
                up) the calm "Quiet for now." state takes over instead,
                folding in the Next-up list. An UPCOMING lead folds into
                UP NEXT: SecHead (full count) → Monument (01) → agate rows
                (02+), one section. */}
            {payload.restingState ? (
              <RestingState items={payload.upNext} />
            ) : showLead && lead ? (
              <>
                {foldUpNext ? (
                  <div className="mb-2">
                    <SecHead
                      name="Up next"
                      count={upNextCountLabel(todayUpNext)}
                    />
                  </div>
                ) : null}
                <FrontPageLead lead={lead} flush={foldUpNext} />
                {foldUpNext ? (
                  <div className="mb-5">
                    <UpNext
                      items={todayUpNext}
                      excludeHref={lead.deck?.href}
                      startIndex={slateStart}
                      showHead={false}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {/* Contextual one-time hint — teach lock-screen tracking the first
                time a followed game is live (native only, dismissible). */}
            <LiveTrackHint active={Boolean(lead?.live)} />

            {/* ALSO LIVE ink band (System D). The lead Monument above is index
                01; this carries every OTHER live followed game as board rows
                (02, 03…). Self-gates to nothing when the lead is the only live
                game (or none), so a 1-live day keeps the calm single Monument.
                At md+ it sits beneath the Monument in the main column. */}
            <AlsoLiveBand items={scoreboard} excludeGameId={lead?.game?.gameId} />

            {/* Calm Ending — series wrapped or season wrapped. Sits above the
                slate so the user sees the acknowledgment first the morning
                after a clinch. Self-suppresses once the moment id is
                dismissed. */}
            {payload.closing ? (
              <div className="mb-5">
                <CalmEndCard moment={payload.closing} />
              </div>
            ) : null}

            {/* Alert reliance check — one-time, after a followed match the
                user had alerts on. The truth loop for the significance engine. */}
            {payload.reliancePrompt ? (
              <RelianceCard prompt={payload.reliancePrompt} />
            ) : null}

            {/* Knockout moment — a followed country advanced or went out. The
                win-or-go-home beat. Each self-suppresses once dismissed. */}
            {payload.knockoutMoments.map((m) => (
              <div key={m.id} className="mb-5">
                <KnockoutMomentCard moment={m} />
              </div>
            ))}

            {/* Slate + setup/footers. space-y-5 preserves the mobile rhythm
                (the plates + rows carry no vertical margin of their own). */}
            <div className="space-y-5">
              {/* Setup — inline slot. Any post-follow nudge (install / enable
                  / recover / optional install) renders here, below the live
                  content, so scores come first. At most one ever shows. */}
              {setup.step && setup.step !== "follow" ? (
                <SetupCard setup={setup} />
              ) : null}

              {/* On a resting day the pointer is shown inside RestingState
                  above; when the lead is folded into UP NEXT, the section
                  already rendered under the Monument. Otherwise (live
                  lead): today's remaining games as the labeled section. */}
              {!payload.restingState && !foldUpNext ? (
                <UpNext
                  items={todayUpNext}
                  excludeHref={showLead ? lead?.deck?.href : undefined}
                  startIndex={slateStart}
                />
              ) : null}

              {/* The one allowed not-today item: the NEXT pointer. */}
              {showNextPointer ? (
                <NextPointer item={futureUpNext[0]} />
              ) : null}

              <QuietWrap items={payload.quietWrap} startIndex={quietWrapStart} />

              {payload.reminder ? (
                <ReminderRow reminder={payload.reminder} />
              ) : null}

              {/* Quiet-day payoff: when nothing's live, nothing's next,
                  nothing just wrapped — and the reminder isn't already
                  filling the page. */}
              {payload.isQuietDay && !payload.reminder ? <CalmCard /> : null}

              {/* You follow — mobile only. The de-chipped System D follow line
                  sits at the foot of the slate (per d-mix), just above The
                  Margin footer. At md+ the sticky right rail carries the agate
                  YOU FOLLOW list instead, so this stays md:hidden. */}
              <div className="md:hidden">
                <FollowLine items={payload.youFollow} />
              </div>

              {/* The Margin nudge — mobile footer (desktop uses the rail). */}
              <BriefPromptCard />
            </div>
          </div>

          {/* Desktop-only sticky right rail — the sports circle (YOU FOLLOW,
              agate) over The Margin nudge, both unboxed. Sticky so they stay
              in view as the main column scrolls. */}
          <aside className="hidden md:block">
            <div className="sticky top-6 space-y-8">
              <YouFollow items={payload.youFollow} />
              <TheMargin />
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
      {/* Label is desktop-only: at 390 it collided with the centered
          wordmark (store-shot QA, 2026-07-04). The dot alone carries the
          ambient state on phones; aria-label carries it for readers. */}
      <span
        className="hidden md:inline"
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
