"use client";

import { useState } from "react";
import { Display } from "../atoms/Display";
import { useFollows } from "../providers";
import { FOLLOW_MOMENTS } from "./FollowChoice";

// PickYourMoment — Phase 21C-3.
//
// A calm guided opening for the Follow Add screen. Renders ONLY when:
//   • the user has zero follows (genuinely new), AND
//   • they haven't tapped "Show me everything" this session
//
// Once the user picks a moment or skips, the picker reveals its full
// moment-grouped layout below. The whole point is to reduce the
// "blank state anxiety" of an empty Follow screen without forcing
// anyone through a flow they don't want.
//
// Why not a separate route or a full-screen blocker:
//   • Per AGENTS.md voice rule — "Plain, simple, chill. Not
//     presumptuous." A modal that hijacks the screen feels
//     presumptuous. An inline capsule with a skip link does not.
//   • Returning users with follows never see this, so it costs them
//     zero attention.
//   • The skip link is always visible from the first paint. Users
//     who came in motivated bail to the full picker in one tap.
//
// The active moments (NBA Playoffs + World Cup 2026) get the two big
// cards. Coming-soon moments (NFL 2026) are surfaced as a quiet
// footnote below — the user knows what's next without it competing
// with the active options.

const ACTIVE_MOMENT_IDS = new Set(["nba-playoffs", "fifa-wc-2026"]);

export function PickYourMoment({
  onSkip,
}: {
  /** Called when the user taps "Show me everything." The parent
   *  shows the full moment-grouped picker. */
  onSkip: () => void;
}) {
  const { follows, hydrated } = useFollows();

  // Bail conditions. Render nothing for returning users so they don't
  // get a flash of the picker on their way to the picker.
  if (!hydrated) return null;
  if (follows.length > 0) return null;

  const activeMoments = FOLLOW_MOMENTS.filter((m) =>
    ACTIVE_MOMENT_IDS.has(m.id)
  );
  const upcomingMoments = FOLLOW_MOMENTS.filter(
    (m) => !ACTIVE_MOMENT_IDS.has(m.id) && m.comingSoon
  );

  return (
    <section
      aria-label="Pick a moment"
      className="mb-5 rounded-[14px] border px-4 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <Display as="h2" size="sm" className="mb-1">
        What are you here for?
      </Display>
      <p
        className="mb-3 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pick the moment that matters right now. You can always add more later.
      </p>

      <div className="space-y-2">
        {activeMoments.map((moment) => (
          <MomentCard key={moment.id} moment={moment} />
        ))}
      </div>

      {/* Coming-soon footnote. Surfaced quietly so users know about
          the next moment without it competing for the tap. */}
      {upcomingMoments.length > 0 ? (
        <p
          className="mt-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {upcomingMoments.map((m) => m.name).join(", ")} coming when the
          season opens.
        </p>
      ) : null}

      {/* The escape hatch — visible from first paint. A motivated
          user bails to the full picker in one tap. */}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-[12px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Show me everything
        </button>
      </div>
    </section>
  );
}

function MomentCard({ moment }: { moment: (typeof FOLLOW_MOMENTS)[number] }) {
  // Anchor links use Next-style hash routing — staying on the same
  // page, scrolling the target moment section into view. The target
  // section gets a scroll-mt-4 class for top-padding on landing.
  const targetHref = `#moment-${moment.id}`;

  return (
    <a
      href={targetHref}
      className="flex items-center gap-3 rounded-[12px] border px-3 py-3 transition active:scale-[0.99]"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
        borderLeft: `4px solid ${moment.accent}`,
        minHeight: 56,
      }}
      aria-label={`Pick ${moment.name}`}
    >
      <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>
        {moment.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[14px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          {moment.name}
        </p>
        <p
          className="mt-0.5 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {moment.description}
        </p>
      </div>
      <span
        aria-hidden
        className="shrink-0"
        style={{ color: "var(--mute-1)", fontWeight: 600, fontSize: 16 }}
      >
        →
      </span>
    </a>
  );
}

/** Wrapper that owns the "skip" state. Render this from FollowingAdd
 *  to get the full inline-then-reveal flow without the parent caring
 *  about hooks. */
export function PickYourMomentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [skipped, setSkipped] = useState(false);
  const { follows, hydrated } = useFollows();

  // If the user already has follows, render the full picker
  // immediately. The PickYourMoment component returns null in that
  // case but this short-circuit avoids even mounting it.
  if (hydrated && follows.length > 0) {
    return <>{children}</>;
  }

  return (
    <>
      {!skipped ? <PickYourMoment onSkip={() => setSkipped(true)} /> : null}
      {children}
    </>
  );
}
