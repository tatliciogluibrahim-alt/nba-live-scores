import { Display } from "../atoms/Display";
import { FOLLOW_MOMENTS, type FollowMoment } from "./FollowChoice";
import { MomentSection } from "./MomentSection";
import { PickYourMomentGate } from "./PickYourMoment";
import { tournamentPhase } from "./data/tournament-phase";

// A moment is followable on the hub unless its tournament has concluded.
// (Coming-soon moments stay followable-shaped; only WRAPPED seasons demote.)
function isConcludedMoment(m: FollowMoment): boolean {
  return (
    !!m.tournamentId && tournamentPhase(m.tournamentId) === "concluded"
  );
}

// /following/add — moment-grouped follow picker. NBA Playoffs and
// Summer Soccer 2026 each get their own section with a granularity
// ladder (broadest first, most-specific last). Same underlying picker
// routes — this layout just makes the model readable: a new user
// understands "I pick a moment, then how much of it" in one glance.
//
// Pre-Phase-8b this was a flat four-noun grid (Team / Country / Series
// / Tournament). The flat layout didn't scale: once a user followed
// NBA Playoffs *and* Knicks, the redundancy wasn't visible, and a
// future NFL Playoffs would have meant "Team" had two unrelated
// meanings. Moment-first sidesteps both.
//
// Phase 21C-3: PickYourMomentGate wraps the moment list so genuinely
// new users (zero follows) see a two-card guided opening before the
// full moment-grouped picker. Returning users with any follows see
// nothing different — the gate falls through immediately. Either way
// there's an always-visible skip link.
//
// Schema is unchanged — the underlying Follow record is still
// { kind: team/country/series/tournament, id }. See Phase 11 design
// doc for the full moment+scope refactor.

export function FollowingAdd() {
  // Lead with what a user can actually follow. Concluded seasons still show
  // (breadth signal — the app covers NBA + soccer) but demoted to the bottom
  // and collapsed to a single quiet row each, so the first thing a new user
  // sees is a live, followable moment, not two dead wrapped ladders.
  const followable = FOLLOW_MOMENTS.filter((m) => !isConcludedMoment(m));
  const concluded = FOLLOW_MOMENTS.filter(isConcludedMoment);

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-2">
        Follow more.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pick a moment, then how much of it. We surface only what you follow.
      </p>

      <PickYourMomentGate>
        <div className="space-y-3">
          {followable.map((moment) => (
            <MomentSection key={moment.id} moment={moment} />
          ))}
        </div>

        {concluded.length > 0 ? (
          <div className="mt-10">
            <p
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "var(--mute-2)",
              }}
            >
              Recently wrapped
            </p>
            <div className="space-y-1">
              {concluded.map((moment) => (
                <MomentSection key={moment.id} moment={moment} collapsed />
              ))}
            </div>
          </div>
        ) : null}
      </PickYourMomentGate>
    </main>
  );
}
