import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
  Quote,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Quiet sports alerts — No Noise Scores",
  description:
    "Per-follow tiers. Quiet hours. Spoiler-safe push previews. Notifications that respect your day.",
  alternates: {
    canonical: "https://nonoisescores.app/features/quiet-sports-alerts",
  },
};

export default function QuietSportsAlertsPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Sports alerts you keep on."
      intro="Per-follow alert tiers. Quiet hours. Spoiler-safe previews. Notifications calibrated for adults who don't want their phone buzzing every two minutes."
    >
      <Quote>
        The fastest way to lose a power user is to send them a push
        they wouldn&apos;t have asked for. So we don&apos;t.
      </Quote>

      <H2>Three tiers per follow</H2>
      <P>
        Every follow you set up gets its own alert tier. You can tune
        them independently, so the team you watch every night gets more
        push than the team you check casually.
      </P>
      <H3Inline>Quiet</H3Inline>
      <P>
        Start and final only. Tipoff or kickoff buzz, then a buzz when
        the game ends. Two pushes per game, max. This is the sweet spot
        for people who want to know &quot;has the game started?&quot;
        without anything in between.
      </P>
      <H3Inline>Companion</H3Inline>
      <P>
        Start, key breaks, final. End-of-quarter, halftime, the start of
        Q4, final score. Around 4-5 pushes per NBA game. Built for
        people who watch the game but don&apos;t always have eyes on it
        — the cooking-while-the-game-is-on use case.
      </P>
      <H3Inline>All moments</H3Inline>
      <P>
        Key swings and close finishes. Everything in Companion plus
        comeback alerts, big runs, the &quot;close game&quot; trigger in
        the final five minutes of a 3-point game. 6-8 pushes per game.
        For the live-watching power user.
      </P>

      <H2>Quiet hours</H2>
      <P>
        Set a daily quiet window — say 10pm to 7am — and we shut up
        across that block. The exception is alerts you&apos;ve explicitly
        marked critical (we don&apos;t make that easy by design, so it
        stays meaningful). Push delivery resumes the moment your window
        ends.
      </P>

      <CalloutBox eyebrow="Day defaults">
        You can set a single default tier for newly-added follows. Most
        users land on Companion. Pick once, then tune the
        edge-case follows individually.
      </CalloutBox>

      <H2>Spoiler-safe push previews</H2>
      <P>
        If you turn No-Spoilers on, every push body is rewritten to stay
        vague. Instead of &quot;Knicks 78 – Cavs 65, end of Q3,&quot;
        you get &quot;Quarter wrapped. Tap to check in.&quot; The buzz
        still tells you the game advanced. The content doesn&apos;t
        leak the state.
      </P>
      <P>
        Close-game and comeback alerts are suppressed entirely under
        No-Spoilers — those are inherently spoilery.
      </P>

      <H2>Per-device</H2>
      <P>
        Push subscriptions are per-device. Phone push works after PWA
        install. Laptop push works after granting permission in Chrome
        or Edge. iPad push works after Add to Home Screen.
      </P>
      <P>
        Multi-device relay (one alert across all your devices in sync)
        is on the roadmap.
      </P>

      <H2>What we don&apos;t do</H2>
      <BulletList
        items={[
          "We don't send notifications based on what we think you'll click. Only what you said you wanted.",
          "We don't bundle marketing into push notifications. \"Don't miss the playoff hub!\" — never.",
          "We don't reactivate dormant users with re-engagement pings. If you stopped using the app, we stop pushing.",
          "We don't sell push data. No advertiser knows you got a Knicks alert.",
        ]}
      />

      <P>
        Configure your alerts in the{" "}
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

// Slightly tighter H3 used inline within the tiers section so each
// tier reads as a labeled paragraph rather than a separate sub-section
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
