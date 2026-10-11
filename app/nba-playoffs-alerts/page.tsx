import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "NBA Playoffs alerts | No Noise Scores",
  description:
    "How No Noise Scores handled the NBA Playoffs: tipoff, quarter-break, close-game, and final alerts for the moments you want.",
  alternates: {
    canonical: "https://nonoisescores.app/nba-playoffs-alerts",
  },
};

// The 2026 playoffs wrapped in June, and concluded moments drop off the
// follow picker, so this page explains what the moment did and points to
// the NFL. Alert contents are read off the code: the preset matrix
// (lib/push/preset-matcher.ts), the close-game and comeback thresholds
// (lib/push/event-detector.ts: Q4 last 5 minutes within 5 points, a
// 15-point lead cut to 5), and the No-Spoilers final push copy
// (lib/push/dispatcher.ts). There is no series-wrap push, so the page no
// longer promises one.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function NBAPlayoffsAlertsPage() {
  return (
    <ContentPageShell
      eyebrow="NBA Playoffs"
      headline="Calm alerts for the playoffs."
      intro="Tipoff, key breaks, close finishes, final. Pushes for the moments that matter."
    >
      <P>
        Most sports apps treat playoff games the same way they treat
        regular-season games: a steady drip of generic notifications.
        This app treats them as the moment they are.
      </P>

      <H2>What you can alert on</H2>
      <BulletList
        items={[
          "Tipoff. Your team's playoff game just started.",
          "End of quarter. The first quarter, halftime, and the end of the third.",
          "Second half. Play resumes after halftime.",
          "Close game. The last five minutes of the fourth, within five points.",
          "Comeback. A 15-point lead cut to five or fewer.",
          "Final. Your team's game just ended.",
        ]}
      />

      <H2>Three tiers, per follow</H2>
      <P>
        Pick a tier for the Knicks, a different tier for the Cavaliers,
        a different one for the entire NBA Playoffs tournament if you
        like. Three options:
      </P>
      <BulletList
        items={[
          "Quiet: tipoff, final, and the rare big moment. Usually two pushes a game.",
          "Companion: tipoff, the end of each quarter, the second half, and the final.",
          "Full Details: adds close finishes, comebacks, and big individual moments.",
        ]}
      />

      <H2>How playoff series context works</H2>
      <P>
        Every playoff game in the app sits inside its series. You see
        the seven-dot strip (one dot per game, filled with the winner&apos;s
        initial), the stake line (&quot;NY can close the series with one
        more win.&quot;), and the next-game line on the recap card.
      </P>
      <P>
        Stakes shape the alerts too. A Game 7 or an elimination game
        counts for more, so its close finish can reach even a Quiet
        follow.
      </P>

      <CalloutBox eyebrow="No-Spoilers">
        With No-Spoilers on, the final push reads &quot;Game&apos;s done.
        Tap when you&apos;re ready.&quot; No score, no winner. Close-game
        and comeback alerts are skipped entirely.
      </CalloutBox>

      <H2>What you don&apos;t get</H2>
      <BulletList
        items={[
          "No \"Top story\" pushes. Not our brand.",
          "No \"Don't miss the playoffs\" hype pushes.",
          "No betting odds in the push body.",
          "No social-share-prompts in the push body.",
          "No re-engagement pings if you stop using the app for a week.",
        ]}
      />

      <H2>This season</H2>
      <P>
        The 2026 playoffs wrapped in June, so NBA follows are closed for
        now. The NFL season is on.{" "}
        <a href="/nfl" style={linkStyle}>
          See how alerts work for the NFL
        </a>
        , or{" "}
        <a href="/app" style={linkStyle}>
          open No Noise Scores
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
