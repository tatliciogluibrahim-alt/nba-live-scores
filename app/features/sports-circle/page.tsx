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
    "Your follows, alerts, pinned games, and No-Spoilers preference — one calm system. That's your sports circle.",
  alternates: {
    canonical: "https://nonoisescores.app/features/sports-circle",
  },
};

export default function SportsCirclePage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Your sports circle."
      intro="Follows, alerts, pinned games, and No-Spoilers — one calm system that personalizes the app without making it talkative."
    >
      <P>
        Most sports apps treat personalization as a settings screen.
        Pick a team, dismiss the dialog, get notified about every minor
        update in that team&apos;s universe until you eventually mute
        the app. We don&apos;t do that.
      </P>
      <P>
        No Noise Scores treats your follows, alerts, and pinned games
        as one connected system. We call it your{" "}
        <strong style={{ color: "var(--ink)" }}>sports circle</strong> —
        the deliberately small set of things you actually care about.
      </P>

      <H2>It&apos;s narrow on purpose</H2>
      <P>
        The average sports fan follows three or four things hard, and
        casually monitors a few more. Most apps assume you want to know
        about all of them, all the time. We assume you want to know
        about the right ones, at the right moments.
      </P>
      <P>
        Your sports circle can hold:
      </P>
      <BulletList
        items={[
          "Teams — Knicks, Eagles, USA.",
          "Countries — for the World Cup, Olympics, etc.",
          "Series — Knicks vs Cavaliers, USA vs Mexico's opening match.",
          "Tournaments — NBA Playoffs, FIFA World Cup 2026.",
        ]}
      />

      <H2>Each item is its own object</H2>
      <P>
        Tap any item in your circle and you go to a real page for that
        object. Not a feed-shaped wrapper around it — an actual
        artifact: scores, recent games, series state, tournament
        structure.
      </P>
      <P>
        That sounds obvious. It&apos;s not. Most sports apps make
        &quot;follow&quot; just a button that filters their feed. We
        make it a relationship with a thing you care about, with its
        own page, its own state, and its own alert preferences.
      </P>

      <CalloutBox eyebrow="The three nouns">
        Follow personalizes. Alert notifies. Pin tracks. Three nouns,
        three distinct verbs. No app we&apos;ve seen draws this line
        cleanly. We did.
      </CalloutBox>

      <H2>Alerts you actually keep on</H2>
      <P>
        Three tiers per follow. Pick once per follow. Quiet for
        peripheral interests. Companion for the team you watch.{" "}
        <em>All moments</em> for the playoff series you&apos;re living
        through.
      </P>
      <P>
        We assume you&apos;ll turn alerts off if they don&apos;t feel
        right. Apple Sports learned this — too-frequent push leads to
        permission revocation. So we ship with restraint as default and
        only ask if you want more.
      </P>

      <H2>One screen for the day</H2>
      <P>
        Your sports circle drives every screen:
      </P>
      <BulletList
        items={[
          "Today shows the games and moments from your circle that matter right now — calmly.",
          "Following is the home of your circle itself, where you add, remove, and tune.",
          "Watching is your pinned games for the day — the live cockpit when one of your follows is playing.",
        ]}
      />

      <H2>It scales with you</H2>
      <P>
        Casual fan? Follow your team. Get pushes on big moments. Open
        the app twice a week. Hardcore fan? Follow your team, your
        country in the World Cup, two series you&apos;re tracking, the
        whole tournament. Pin every game your team plays. Set per-follow
        tiers based on each one&apos;s emotional weight to you.
      </P>
      <P>
        Either way, the app stays calm and the noise stays out.
      </P>

      <P>
        Build your sports circle in the{" "}
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
