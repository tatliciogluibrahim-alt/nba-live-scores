import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Sports circle | No Noise Scores",
  description:
    "Your follows, alerts, and tracked games as one connected system. That's your sports circle.",
  alternates: {
    canonical: "https://nonoisescores.app/features/sports-circle",
  },
};

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function SportsCirclePage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Your sports circle."
      intro="Follows, alerts, tracked games, and No-Spoilers as one connected system that personalizes the app without making it noisy."
    >
      <P>
        In most sports apps, personalization is a settings screen. You pick
        a team, dismiss the dialog, then get notified about every minor
        update until you mute the app. This one works differently.
      </P>
      <P>
        No Noise Scores treats your follows, alerts, and tracked games as
        one connected system. The small set of things you actually care
        about. We call it your{" "}
        <strong style={{ color: "var(--ink)" }}>sports circle</strong>.
      </P>

      <H2>What goes in it</H2>
      <BulletList
        items={[
          "Teams. The Lions, the Knicks, the Eagles.",
          "Countries, for tournaments like Summer Soccer 2026.",
          "Series. A playoff matchup, like Knicks vs Cavaliers.",
          "Whole events. The NFL season, or a tournament like the NBA Playoffs.",
        ]}
      />

      <H2>Pages of their own</H2>
      <P>
        Countries, series, and tournaments each have a page of their own,
        with recent games, series state, the group tables, or the bracket.
      </P>

      <CalloutBox eyebrow="Three verbs">
        Follow personalizes. Alert notifies. Track keeps one game in view.
        Three verbs, three jobs.
      </CalloutBox>

      <H2>Alerts you keep on</H2>
      <P>
        Three levels per follow: Quiet, Companion, Full Details. Pick the
        level that fits the team. Quiet for peripheral interests.
        Companion for the team you watch. Full Details for the playoff
        series you&apos;re living through.
      </P>

      <H2>Every tab reads from it</H2>
      <P>Your sports circle drives every screen:</P>
      <BulletList
        items={[
          "Today shows what's happening now for your follows.",
          "Schedule holds the full week or tournament when you want the whole picture.",
          "Following is where your circle lives. Add, remove, tune.",
          "Watching holds the games you're tracking.",
        ]}
      />

      <P>
        Build yours in the{" "}
        <a href="/app" style={linkStyle}>
          app
        </a>
        . Start with one team and see how it feels.
      </P>
    </ContentPageShell>
  );
}
