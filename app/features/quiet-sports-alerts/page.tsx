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
    "Per-follow alert levels. Quiet hours. Push previews that respect No-Spoilers.",
  alternates: {
    canonical: "https://nonoisescores.app/features/quiet-sports-alerts",
  },
};

export default function QuietSportsAlertsPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Sports alerts you keep on."
      intro="Per-follow alert levels, quiet hours, spoiler-safe previews. Calmer than the defaults you're used to."
    >
      <H2>Three levels per follow</H2>
      <P>
        Each follow gets its own alert level. Different team, different
        level. The team you watch every night gets more pings than the
        team you check casually.
      </P>
      <H3Inline>Quiet</H3Inline>
      <P>
        Start and final only. Tipoff or kickoff buzz, then a buzz when
        the game ends. Two pushes per game, max.
      </P>
      <H3Inline>Companion</H3Inline>
      <P>
        Start, key breaks, final. End-of-quarter, halftime, start of Q4,
        final score. Around 4-5 pushes per NBA game.
      </P>
      <H3Inline>Full Details</H3Inline>
      <P>
        Adds close-game and comeback alerts on top of Companion. Around
        6-8 pushes per dramatic game.
      </P>

      <H2>Quiet hours</H2>
      <P>
        Set a daily quiet window, say 10pm to 7am, and pushes hold off
        across that block. Delivery resumes the moment your window ends.
      </P>

      <CalloutBox eyebrow="Defaults">
        You can set a default level for newly-added follows. Most
        people land on Companion, then tune the edge-case follows
        individually.
      </CalloutBox>

      <H2>Spoiler-safe push previews</H2>
      <P>
        Turn No-Spoilers on and every push body is rewritten to stay
        vague. Instead of &quot;Knicks 78, Cavs 65, end of Q3,&quot; you
        get &quot;Quarter wrapped. Tap to check in.&quot; The buzz still
        tells you something changed. The content doesn&apos;t leak the
        state.
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
          "\"Don't miss the playoffs!\" hype.",
          "Re-engagement pings if you stop using the app.",
          "Selling push data. No advertiser knows you got a Knicks alert.",
        ]}
      />

      <P>
        Set up alerts in the{" "}
        <a
          href="/app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          app
        </a>{" "}
        under Alerts & Notifications.
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
