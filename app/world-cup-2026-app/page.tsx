import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "Summer Soccer 2026 app | No Noise Scores",
  description:
    "Pick your country. Countdown to kickoff. Group context. Path to the final. Kickoff and full-time alerts. June 11, 2026.",
  alternates: {
    canonical: "https://nonoisescores.app/world-cup-2026-app",
  },
};

export default function WorldCup2026Page() {
  return (
    <ContentPageShell
      eyebrow="Summer Soccer 2026"
      headline="A calm companion for the Summer Soccer."
      intro="June 11, 2026. Mexico City. Pick your country. Countdown, your group, kickoff and full-time pings."
    >
      <P>
        Summer Soccer 2026 is a 32-day event across the US,
        Canada, and Mexico. Most football apps either treat it like
        regular-season schedule or drown you in a generic
        soccer-everywhere feed. This one is the opposite: a calm
        tournament companion built for this specific month.
      </P>

      <H2>What the Summer Soccer pages do</H2>
      <BulletList
        items={[
          "Pick your country. You see your country's path through the tournament. Group, opponents, knockout bracket.",
          "Live countdown to the opening match (June 11) with intensity tiers as kickoff approaches.",
          "Group strip showing your group's current standings (lights up post-kickoff).",
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
        On the country page, the tournament countdown will carry the
        screen through the next 16 days. Once kickoff arrives,
        we&apos;ll switch to surfacing your country&apos;s next match
        and live state.
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
