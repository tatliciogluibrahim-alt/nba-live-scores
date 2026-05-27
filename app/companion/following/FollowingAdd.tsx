import { Display } from "../atoms/Display";
import { FOLLOW_MOMENTS } from "./FollowChoice";
import { MomentSection } from "./MomentSection";
import { PickYourMomentGate } from "./PickYourMoment";

// /following/add — moment-grouped follow picker. NBA Playoffs and
// FIFA World Cup 2026 each get their own section with a granularity
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
          {FOLLOW_MOMENTS.map((moment) => (
            <MomentSection key={moment.id} moment={moment} />
          ))}
        </div>
      </PickYourMomentGate>
    </main>
  );
}
