import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "NBA Playoffs alerts",
  description:
    "Follow your team through the playoffs. Tipoff, close-game, final, series-wrap pushes for the moments you want.",
  alternates: {
    canonical: "https://nonoisescores.app/nba-playoffs-alerts",
  },
};

export default function NBAPlayoffsAlertsPage() {
  return (
    <ContentPageShell
      eyebrow="NBA Playoffs"
      headline="Calm alerts for the playoffs."
      intro="Tipoff, key breaks, close finishes, final, series-wrap. Pushes for the moments that matter."
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
          "End of quarter. Q1 wrapped, Q2 wrapped, halftime, end of Q3.",
          "Last quarter. Q4 is about to start.",
          "Close-game. The final minutes of a 3-point game.",
          "Comeback. A 15+ point lead just got erased.",
          "Final. Your team's game just ended.",
          "Series-wrap. A series just got decided.",
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
          "Quiet: Tipoff and Final only. Two pushes per game.",
          "Companion: Tipoff, end-of-Q, last quarter, Final. Around 4–5 per game.",
          "All moments: adds close-game and comeback. Around 6–8 per dramatic game.",
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
        That means your alerts come with context. The final-buzz push
        knows whether the series just wrapped, whether your team faces
        elimination, whether the series is 3-3 with a Game 7 looming.
      </P>

      <CalloutBox eyebrow="Series-wrap alerts">
        When a series ends, you get one final push that names the result
        and the advancement: &quot;Series · NY took it 4-2. They
        advance.&quot; If No-Spoilers is on, you get &quot;Series
        wrapped. Tap when you&apos;re ready.&quot;
      </CalloutBox>

      <H2>What you don&apos;t get</H2>
      <BulletList
        items={[
          "No \"Top story\" pushes. Not our brand.",
          "No \"Don't miss the playoffs!\" hype pushes.",
          "No betting odds in the push body.",
          "No social-share-prompts in the push body.",
          "No re-engagement pings if you stop using the app for a week.",
        ]}
      />

      <H2>How to set it up</H2>
      <P>
        Install the app on your phone (
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
        ; on Android, Chrome will prompt). Open it, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Following</strong>, add
        your team or a specific playoff series. Tap the row, set the
        tier to Companion or higher. Done.
      </P>
      <P>
        Notifications will start firing at tipoff of the next game.
      </P>

      <P>
        Try it.{" "}
        <a
          href="/app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          open No Noise Scores
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
