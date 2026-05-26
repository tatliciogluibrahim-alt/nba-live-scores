import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Sports circle — No Noise Scores",
  description:
    "Your follows, alerts, and pinned games as one connected system. That's your sports circle.",
  alternates: {
    canonical: "https://nonoisescores.app/features/sports-circle",
  },
};

export default function SportsCirclePage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Your sports circle."
      intro="Follows, alerts, pinned games, and No-Spoilers as one connected system that personalizes the app without making it noisy."
    >
      <P>
        Most sports apps treat personalization as a settings screen. Pick
        a team, dismiss the dialog, get notified about every minor update
        until you eventually mute the app. This one tries to do it
        differently.
      </P>
      <P>
        No Noise Scores treats your follows, alerts, and pinned games as
        one connected system — the small set of things you actually care
        about. We call it your{" "}
        <strong style={{ color: "var(--ink)" }}>sports circle</strong>.
      </P>

      <H2>What goes in it</H2>
      <BulletList
        items={[
          "Teams — Knicks, Eagles, USA.",
          "Countries — for the World Cup, Olympics, etc.",
          "Series — Knicks vs Cavaliers, USA's opening match.",
          "Tournaments — NBA Playoffs, FIFA World Cup 2026.",
        ]}
      />

      <H2>Each item is its own page</H2>
      <P>
        Tap anything in your circle and you get a real page for that
        object — scores, recent games, series state, tournament
        structure. Not a feed wrapped around it; an actual page.
      </P>

      <CalloutBox eyebrow="Three nouns">
        Follow personalizes. Alert notifies. Pin tracks a specific
        game. Three nouns, three jobs.
      </CalloutBox>

      <H2>Alerts you keep on</H2>
      <P>
        Three levels per follow: Quiet, Companion, All moments. Pick the
        level that fits the team. Quiet for peripheral interests.
        Companion for the team you watch. All moments for the playoff
        series you&apos;re living through.
      </P>

      <H2>One screen for the day</H2>
      <P>
        Your sports circle drives every screen:
      </P>
      <BulletList
        items={[
          "Today shows what's happening right now for your follows.",
          "Following is where your circle lives — add, remove, tune.",
          "Watching is for the game you pinned for the night.",
        ]}
      />

      <P>
        Build yours in the{" "}
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
        — start with one team, see how it feels.
      </P>
    </ContentPageShell>
  );
}
