"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFollows, useNoSpoilers } from "../providers";
import { useWCSchedule, WCGroups } from "../tournament/WCGroups";
import { ByDayView } from "../tournament/WCBracket";
import { WCBracketTree } from "../tournament/WCBracketTree";
import { NFLScheduleBody } from "./NFLScheduleBody";
import {
  buildBracketRounds,
  followedCountrySet,
} from "../tournament/wc-bracket-data";
import { WC_TOURNAMENT_ID } from "../following/data/tournaments";
import { NFL_2026_SEASON_OPENER } from "../following/data/nfl-dates";
import {
  activeScheduleCompetitions,
  scopeCompetitions,
  competitionFamily,
  type ScheduleCompetition,
  type ScheduleView,
} from "./competitions";
import {
  scheduleHref,
  type ScheduleRouteState,
} from "./schedule-route";

// The Schedule surface (S1 2026-07-06 schedule-ia-waterfall; sports-agnostic
// 2026-07-14). Contract: how does the whole competition unfold — complete,
// impersonal, structure and time only. It never filters to follows within a
// competition (Today does that); follows get row emphasis inside the views.
//
// Sports-agnostic frame: a scope toggle (Following / All sports) + a
// competition switcher sit at the top. With one competition in scope the
// switcher hides and the body renders as it always has (no visible change to
// the live World Cup). A second competition (NFL from Aug 2026) registers in
// the competitions registry and slots into the switcher with zero rework here.

const VIEW_LABELS: Record<ScheduleView, string> = {
  byday: "By day",
  bracket: "Bracket",
  groups: "Groups",
  byweek: "By week",
  standings: "Standings",
};

export function ScheduleClient({
  scope,
  competition: selectedId,
  view: requestedView,
}: ScheduleRouteState) {
  const { follows } = useFollows();
  const router = useRouter();

  function updateScheduleState(patch: Partial<ScheduleRouteState>) {
    router.replace(
      scheduleHref(
        { scope, competition: selectedId, view: requestedView },
        patch
      ),
      { scroll: false }
    );
  }
  // Competition phases can cross while the native shell remains mounted for
  // hours. Refresh the lifecycle clock slowly and on resume so a boundary
  // never requires a manual route remount.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    const tick = setInterval(refreshNow, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const all = activeScheduleCompetitions(follows, now);
  const inScope = scopeCompetitions(all, scope);
  // Selection normalizes against what's in scope, so flipping scope or losing
  // a competition never leaves a dangling selection.
  const selected =
    inScope.find((c) => c.id === selectedId) ?? inScope[0] ?? null;

  // Whether the scope toggle earns its place: only when scoping actually
  // changes what's shown (more than one competition exists, or the single one
  // isn't followed so "Following" would be empty).
  const showScope = all.length > 1 || (all.length === 1 && !all[0].followed);
  const gameReturnTo = scheduleHref(
    { scope, competition: selectedId, view: requestedView },
    {}
  );

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
      </header>

      {showScope ? (
        <ScopeToggle
          scope={scope}
          onScope={(nextScope) => updateScheduleState({ scope: nextScope })}
        />
      ) : null}

      {inScope.length > 1 ? (
        <CompetitionSwitcher
          competitions={inScope}
          selectedId={selected?.id ?? null}
          onSelect={(id) => updateScheduleState({ competition: id })}
        />
      ) : null}

      {selected ? (
        <CompetitionBody
          competition={selected}
          view={requestedView}
          onView={(view) => updateScheduleState({ view })}
          gameReturnTo={gameReturnTo}
        />
      ) : (
        <IdleState
          liveElsewhere={all.filter((c) => c.status === "live")}
          upcomingElsewhere={all.filter((c) => c.status === "upcoming")}
          onSeeAll={() =>
            updateScheduleState({ scope: "all", competition: null })
          }
        />
      )}
    </>
  );
}

// ── Scope toggle — Following (default) vs All sports ───────────────────
function ScopeToggle({
  scope,
  onScope,
}: {
  scope: "following" | "all";
  onScope: (s: "following" | "all") => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      {(
        [
          ["following", "Following"],
          ["all", "All sports"],
        ] as const
      ).map(([key, label]) => {
        const on = key === scope;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (!on) onScope(key);
            }}
            aria-pressed={on}
            className="uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              fontWeight: on ? 700 : 600,
              color: on ? "var(--cream)" : "var(--mute-1)",
              background: on ? "var(--ink)" : "transparent",
              border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 999,
              padding: "5px 12px",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Competition switcher — one competition at a time (decision: switcher) ──
function CompetitionSwitcher({
  competitions,
  selectedId,
  onSelect,
}: {
  competitions: ScheduleCompetition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {competitions.map((c) => {
        const on = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={on}
            className="shrink-0 whitespace-nowrap uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              fontWeight: on ? 700 : 600,
              color: on ? "var(--ink)" : "var(--mute-2)",
              background: "transparent",
              borderBottom: on
                ? "2px solid var(--ink)"
                : "2px solid transparent",
              padding: "6px 2px",
            }}
          >
            {c.name.replace(/\s+\d{4}$/, "")}
            {c.status === "comingsoon" ? " · soon" : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Body dispatch by competition ───────────────────────────────────────
function CompetitionBody({
  competition,
  view,
  onView,
  gameReturnTo,
}: {
  competition: ScheduleCompetition;
  view: ScheduleView | null;
  onView: (view: ScheduleView) => void;
  gameReturnTo: string;
}) {
  if (competition.views.length > 0) {
    // Dispatch on the competition FAMILY, not on a view-name membership
    // check. NFL renders By-week/Standings; the World Cup renders
    // By-day/Bracket/Groups. A future family (NBA standings) slots in here.
    const family = competitionFamily(competition.id);
    if (family === "nfl") {
      return (
        <NFLScheduleBody
          views={competition.views as ("byweek" | "standings")[]}
          requestedView={
            view === "byweek" || view === "standings" ? view : null
          }
          onView={onView}
          gameReturnTo={gameReturnTo}
        />
      );
    }
    return (
      <WCScheduleBody
        views={competition.views}
        requestedView={view}
        onView={onView}
        gameReturnTo={gameReturnTo}
      />
    );
  }
  if (competition.status === "comingsoon") {
    return <ComingSoonBody competition={competition} />;
  }
  if (competition.status === "concluded") {
    return <ConcludedBody competition={competition} />;
  }
  return <LiveElsewhereBody competition={competition} />;
}

// ── World Cup body — the existing By day / Bracket / Groups, unchanged ──
function WCScheduleBody({
  views,
  requestedView,
  onView,
  gameReturnTo,
}: {
  views: ScheduleView[];
  requestedView: ScheduleView | null;
  onView: (view: ScheduleView) => void;
  gameReturnTo: string;
}) {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const noSpoilers = useNoSpoilers();
  const { rounds } = buildBracketRounds(fixtures, followedCountrySet(follows));
  const activeView =
    requestedView && views.includes(requestedView)
      ? requestedView
      : views[0];

  return (
    <div className="mt-4">
      {noSpoilers ? (
        <p
          className="mb-2 text-[12.5px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Scores stay hidden. The bracket still fills in as rounds finish.
        </p>
      ) : null}

      {/* View switch — sticky ("freeze pane"): switching to BRACKET or GROUPS
          never requires scrolling back to the top. */}
      <div
        className="sticky z-20 -mx-4 mb-3 flex px-4 pt-1 md:mx-0 md:px-0"
        style={{
          top: "calc(max(env(safe-area-inset-top), 12px) + 32px)",
          borderBottom: "1px solid var(--line)",
          background: "var(--bar-blur-bg, var(--cream))",
          backdropFilter: "blur(8px)",
        }}
      >
        {views.map((key) => {
          const on = key === activeView;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onView(key)}
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
              {VIEW_LABELS[key]}
            </button>
          );
        })}
      </div>

      {activeView === "byday" ? (
        <ByDayView
          rounds={rounds}
          gameOrigin="schedule"
          gameReturnTo={gameReturnTo}
        />
      ) : null}
      {activeView === "bracket" ? (
        <WCBracketTree
          gameOrigin="schedule"
          gameReturnTo={gameReturnTo}
        />
      ) : null}
      {activeView === "groups" ? (
        <WCGroups
          tournamentId={WC_TOURNAMENT_ID}
          mode="full"
          gameOrigin="schedule"
          gameReturnTo={gameReturnTo}
        />
      ) : null}
    </div>
  );
}

// ── Status cards for competitions without a built schedule view ─────────

function StatusCard({
  eyebrow,
  headline,
  detail,
  cta,
}: {
  eyebrow: string;
  headline: string;
  detail: string;
  cta?: { label: string; href: string };
}) {
  return (
    <section
      className="mt-6"
      style={{ borderTop: "2px solid var(--rule)", padding: "14px 0" }}
    >
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        {eyebrow}
      </p>
      <p
        className="mt-1 text-[15px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        {headline}
      </p>
      <p
        className="mt-1 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {detail}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--ink)",
          }}
        >
          {cta.label}
          <span aria-hidden>→</span>
        </Link>
      ) : null}
    </section>
  );
}

function ComingSoonBody({ competition }: { competition: ScheduleCompetition }) {
  const name = competition.name.replace(/\s+\d{4}$/, "");
  return (
    <StatusCard
      eyebrow="Coming soon"
      headline={`${name} opens ${NFL_2026_SEASON_OPENER.label}.`}
      detail="The schedule lands closer to kickoff. Follow a team now and it'll be waiting for you."
      cta={{ label: "Follow a team", href: "/following" }}
    />
  );
}

function ConcludedBody({ competition }: { competition: ScheduleCompetition }) {
  const name = competition.name.replace(/\s+\d{4}$/, "");
  return (
    <StatusCard
      eyebrow="Wrapped"
      headline={`${name} is in the books.`}
      detail="The results stay here to browse. Nothing live left on the schedule."
      cta={{ label: "Browse results", href: `/tournament/${competition.id}` }}
    />
  );
}

function LiveElsewhereBody({ competition }: { competition: ScheduleCompetition }) {
  const name = competition.name.replace(/\s+\d{4}$/, "");
  return (
    <StatusCard
      eyebrow="Live now"
      headline={`${name} is on.`}
      detail="Follow it on Today for the moments that matter."
      cta={{ label: "Open Today", href: "/app" }}
    />
  );
}

// ── Idle state — Following scope with nothing followed in scope ─────────
// The retention hook (decision 2, 2026-07-14): never a dead end. If something
// is live now it names it and points there; otherwise it names the next moment
// on the calendar. One tap to see everything that's on.
function IdleState({
  liveElsewhere,
  upcomingElsewhere,
  onSeeAll,
}: {
  liveElsewhere: ScheduleCompetition[];
  upcomingElsewhere: ScheduleCompetition[];
  onSeeAll: () => void;
}) {
  // "On now" language keys on genuinely live competitions ONLY. An upcoming
  // competition is not live — claiming it is would be the same false-liveness
  // bug as a finished-game push that says a live game is over.
  const live = liveElsewhere[0];
  const upcoming = upcomingElsewhere[0];
  const stripYear = (name: string) => name.replace(/\s+\d{4}$/, "");
  const eyebrow = live ? "On now" : upcoming ? "Coming up" : "Quiet stretch";
  const headline = live
    ? `The ${stripYear(live.name)} is on right now.`
    : upcoming
      ? `The ${stripYear(upcoming.name)} is up next.`
      : "Nothing you follow is on the schedule right now.";
  const detail = live
    ? "You don't follow it yet. See what's on across every sport."
    : upcoming
      ? "You don't follow it yet. See what's on across every sport."
      : `NFL opens ${NFL_2026_SEASON_OPENER.label}. Until then, see what else is on.`;
  return (
    <section
      className="mt-6"
      style={{ borderTop: "2px solid var(--rule)", padding: "14px 0" }}
    >
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        {eyebrow}
      </p>
      <p
        className="mt-1 text-[15px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        {headline}
      </p>
      <p
        className="mt-1 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {detail}
      </p>
      <button
        type="button"
        onClick={onSeeAll}
        className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--ink)",
          background: "transparent",
        }}
      >
        See all sports
        <span aria-hidden>→</span>
      </button>
    </section>
  );
}
