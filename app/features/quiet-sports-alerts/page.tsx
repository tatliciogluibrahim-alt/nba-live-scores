import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Quiet sports alerts | No Noise Scores",
  description:
    "Per-follow alert levels, and push previews that respect No-Spoilers.",
  alternates: {
    canonical: "https://nonoisescores.app/features/quiet-sports-alerts",
  },
};

// Tier copy follows PRESETS (state/types.ts) and, for the NFL, the
// docs/nfl-design.md tier mapping as amended by the 2026-09-20 audit.
// "Usually two pushes a game" on Quiet is the replay lab's measured median
// for a team follow. The old per-game counts for Companion and Full
// Details had no measured source, so they came out (data-integrity rule).
// Quiet hours came out too: the backend honors them, but no screen in the
// app lets you set them (QuietHoursSelector is never rendered).

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function QuietSportsAlertsPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Sports alerts you keep on."
      intro="Per-follow alert levels and spoiler-safe previews. Calmer than the defaults you're used to."
    >
      <H2>Three levels per follow</H2>
      <P>
        Each follow gets its own alert level. Different team, different
        level. The team you watch every night gets more pings than the
        team you check casually.
      </P>
      <H3Inline>Quiet</H3Inline>
      <P>
        Start and final, plus the rare big moment like overtime. A buzz at
        tipoff or kickoff, a buzz when the game ends, and one more only if
        the game earns it. Usually two pushes a game.
      </P>
      <H3Inline>Companion</H3Inline>
      <P>
        Start, the breaks, the scores that matter for your team, and the
        final. In the NFL, that&apos;s the end of the first quarter,
        halftime, the end of the third, and your team&apos;s touchdowns. In
        the NBA, it&apos;s the end of each quarter and the start of the
        second half.
      </P>
      <H3Inline>Full Details</H3Inline>
      <P>
        Every moment, every game. In the NFL, every touchdown and field
        goal from both teams, plus turnovers and plays of 40 yards or more.
        In the NBA, close finishes, comebacks, and big individual moments
        on top of Companion.
      </P>

      <CalloutBox eyebrow="Defaults">
        New NFL follows start on Quiet. Tap any follow in Following to
        change its level. Alerts are free on your first three follows.
      </CalloutBox>

      <H2>Spoiler-safe push previews</H2>
      <P>
        Turn No-Spoilers on and every push body is rewritten to stay
        vague. Instead of &quot;Knicks 78, Cavs 65, end of Q3,&quot; you
        get &quot;Quarter wrapped. Tap to check in.&quot; An NFL touchdown
        push reads &quot;A touchdown was scored.&quot; The buzz still tells
        you something changed. The content doesn&apos;t leak the state.
      </P>
      <P>
        Close-game and comeback alerts are skipped entirely under
        No-Spoilers. Those are inherently spoilery.
      </P>

      <H2>What we don&apos;t do</H2>
      <BulletList
        items={[
          "Push based on what we think you'll click.",
          "Marketing pings in the notification body.",
          "\"Don't miss the playoffs\" hype.",
          "Re-engagement pings if you stop using the app.",
          "Selling push data. No advertiser knows you got a Knicks alert.",
        ]}
      />

      <P>
        Set up alerts in the{" "}
        <a href="/app" style={linkStyle}>
          app
        </a>
        : tap a follow in Following to pick its level. For the NFL
        specifics,{" "}
        <a href="/nfl" style={linkStyle}>
          see the NFL page
        </a>
        .
      </P>
    </ContentPageShell>
  );
}

// Slightly tighter H3 used inline within the levels section so each
// level reads as a labeled paragraph rather than a separate sub-section
// with its own air.
function H3Inline({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mt-8 mb-1 leading-tight"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--nba)",
      }}
    >
      {children}
    </h3>
  );
}
