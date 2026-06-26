import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "World Cup 2026 app | No Noise Scores",
  description:
    "A calm World Cup 2026 companion. Pick your country, follow your group and the path to the final, and get kickoff and full-time alerts. No feeds, no noise.",
  alternates: {
    canonical: "https://nonoisescores.app/world-cup-2026-app",
  },
};

export default function WorldCup2026Page() {
  return (
    <ContentPageShell
      eyebrow="World Cup 2026"
      headline="A calm companion for the 2026 World Cup."
      intro="Pick your country. Your group, the path to the final, and kickoff and full-time pings, all the way through the knockouts."
    >
      <P>
        The 2026 World Cup is a 32-day event across the US, Canada, and
        Mexico. Most football apps either treat it like a regular-season
        schedule or drown you in a generic soccer-everywhere feed. This one
        is the opposite: a calm tournament companion built for this
        specific month. (Inside the app the tournament is labelled
        &quot;Summer Soccer&quot;. Same event, calmer name.)
      </P>

      <H2>What the Summer Soccer pages do</H2>
      <BulletList
        items={[
          "Pick your country. You see your country's path through the tournament. Group, opponents, knockout bracket.",
          "Live scores and your country's standing through the group stage and into the knockout rounds.",
          "Group strip with your group's live standings.",
          "Path timeline. Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final.",
          "Stakes line: \"Top two in Group X advance. Best four third-place finishers also move on.\"",
          "Country's next match block. Opponent, time, channel.",
        ]}
      />

      <H2>What the alerts do</H2>
      <P>
        Follow your country, turn alerts on, and we&apos;ll send a push
        when:
      </P>
      <BulletList
        items={[
          "Kickoff. Your country's match just started.",
          "Full time. The match just ended.",
        ]}
      />
      <P>
        Tournament alerts (Summer Soccer as a follow object) cover the
        same plus tournament-wide moments (final-day kickoff, group-stage
        wrap, etc).
      </P>

      <CalloutBox eyebrow="No-Spoilers ready">
        Watching the match on delay tonight? Turn No-Spoilers on. Group
        standings, scores, and recap cards stay blurred. The push you
        get at full-time will read &quot;Match wrapped. Tap when
        you&apos;re ready.&quot; No score, no winner.
      </CalloutBox>

      <H2>How it&apos;s different from FotMob / SofaScore</H2>
      <P>
        FotMob and SofaScore are excellent soccer-stats apps. They
        cover every league, every season, with heatmaps, expected
        goals, and deep lineups.
      </P>
      <P>
        That&apos;s not what we are. We&apos;re a calm tournament
        companion focused on the Summer Soccer specifically. No heatmaps,
        no xG, no formations grid. If you want those stats, FotMob is
        the right tool. If you want a calm place to track your country
        through a one-month-long event without the rest of the
        soccer-world noise, that&apos;s us.
      </P>

      <H2>Set it up</H2>
      <P>
        Install the app (
        <a
          href="/guides/how-to-add-to-iphone-home-screen"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          iPhone install guide
        </a>
        ). Open it, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Following</strong>, pick
        a country from the Summer Soccer section. Turn alerts on.
      </P>
      <P>
        On the country page you see your country&apos;s next match, its
        live state during a game, and its path through the knockout
        rounds.
      </P>

      <P>
        <a
          href="/app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          Open the app
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
