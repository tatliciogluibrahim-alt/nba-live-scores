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
    "How No Noise Scores followed the 2026 World Cup, June 11 to July 19. Country pages, the group tables, the bracket, and kickoff and full-time alerts. No feeds, no noise.",
  alternates: {
    canonical: "https://nonoisescores.app/world-cup-2026-app",
  },
};

// Past tense since the final (2026-07-19). Facts come from the frozen
// record (scripts/fixtures/wc-frozen-schedule-2026.json, the same frozen
// champion production serves): 104 fixtures from June 11 to July 19, and
// the final, ARG 0 at ESP 1, Spain champions. The advancement rule is
// the 48-team format's: top two per group plus the eight best third-
// placed teams (the app's own tournament footnote says the same).
// The SEO title keeps the factual "World Cup" name. New sentences use
// "Summer Soccer", the name inside the app.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function WorldCup2026Page() {
  return (
    <ContentPageShell
      eyebrow="World Cup 2026"
      headline="A calm companion for the 2026 World Cup."
      intro="The tournament ran from June 11 to July 19. Fans picked a country and got its group, its path to the final, and kickoff and full-time alerts all the way through the knockouts."
    >
      <P>
        The 2026 World Cup was played across the US, Canada, and Mexico.
        No Noise Scores followed it as a tournament companion: your
        country, your group, and the bracket, without a soccer-everywhere
        feed around them. (Inside the app the tournament was labeled
        &quot;Summer Soccer&quot;. Same event, calmer name.)
      </P>
      <P>
        Spain beat Argentina 1-0 in the final on July 19.
      </P>

      <H2>What the app did for Summer Soccer</H2>
      <BulletList
        items={[
          "Pick your country, and you saw its path through the tournament. Group, opponents, knockout bracket.",
          "Live scores and your country's standing through the group stage and into the knockout rounds.",
          "Your group's table, with live standings during the group stage.",
          "The path to the final: Round of 32, Round of 16, quarterfinals, semifinals, final.",
          "Stakes lines that said what each match meant. The top two in each group went through, along with the eight best third-placed teams.",
          "Your country's next match. Opponent, time, channel.",
        ]}
      />

      <H2>What the alerts did</H2>
      <P>
        Follow your country, turn alerts on, and a push arrived when:
      </P>
      <BulletList
        items={[
          "Kickoff. Your country's match had just started.",
          "Full time. The match had just ended.",
        ]}
      />
      <P>
        Companion and Full Details added halftime, the second half, and
        goals.
      </P>

      <CalloutBox eyebrow="No-Spoilers">
        Watching a match on delay? With No-Spoilers on, scores and group
        standings stayed hidden until you tapped, and the full-time push
        read &quot;Match wrapped. Tap when you&apos;re ready.&quot; No
        score, no winner. It works the same way for the{" "}
        <a href="/nfl" style={linkStyle}>
          NFL season
        </a>{" "}
        now.
      </CalloutBox>

      <H2>How it compared to FotMob and SofaScore</H2>
      <P>
        FotMob and SofaScore are excellent soccer-stats apps. They
        cover every league, every season, with heatmaps, expected
        goals, and deep lineups.
      </P>
      <P>
        That&apos;s not what this is. No Noise Scores was a calm
        tournament companion for Summer Soccer specifically. No heatmaps,
        no xG, no formations grid. For those stats, FotMob is the right
        tool. For a calm place to track your country through the
        tournament without the rest of the soccer-world noise, that was
        us.
      </P>

      <H2>What&apos;s still there</H2>
      <P>
        Each country&apos;s page in the app still shows its final group
        table.
      </P>
      <P>
        <a href="/app" style={linkStyle}>
          Open the app
        </a>
        , or see{" "}
        <a href="/nfl" style={linkStyle}>
          what it&apos;s following now
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
