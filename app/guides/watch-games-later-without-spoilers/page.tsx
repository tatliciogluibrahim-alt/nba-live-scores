import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Watch games later without spoilers | No Noise Scores",
  description:
    "Recorded the game? Watch it on delay without seeing scores, headlines, or push previews. Here's how.",
  alternates: {
    canonical:
      "https://nonoisescores.app/guides/watch-games-later-without-spoilers",
  },
};

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function WatchLaterGuide() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="How to watch a game later without spoilers."
      intro="If you're watching a game later, here's how to stay spoiler-free across the apps on your phone."
    >
      <P>
        The hardest part of watching on delay isn&apos;t the sports app
        you choose. It&apos;s every notification, feed, and friend
        group chat that leaks the score first.
      </P>
      <P>
        No Noise Scores can&apos;t silence your friends, but it won&apos;t
        spoil you while the app is open. Here&apos;s how to set up the
        rest.
      </P>

      <H2>Step 1. Turn No-Spoilers on</H2>
      <P>
        Open the app and go to Settings. On your phone, it&apos;s at the
        bottom of the Following tab. On a computer, it&apos;s in the
        sidebar. Turn on{" "}
        <strong style={{ color: "var(--ink)" }}>No-Spoilers</strong>{" "}
        at the top of the page.
      </P>
      <P>
        That&apos;s the one switch. From this point forward, every score,
        headline, series state, and recap stays hidden until you tap to
        reveal. Push notification bodies stay vague.
      </P>

      <H2>Step 2. Confirm the contract</H2>
      <P>
        Before you start the game, spot-check the contract:
      </P>
      <BulletList
        items={[
          "Open Today. You should see a small muted dot in the header indicating No-Spoilers is on.",
          "Open a game that's already over. The score should be placeholder dots, and nothing on the page should name the winner.",
          "On an NFL game page, the scoring plays should fold into one hidden row, with no top performers.",
          "If you have alerts on, the next push you get should not name a score, a winner, or a player.",
        ]}
      />
      <P>
        Anything leaks? Tell us. The contract is end-to-end on purpose.
      </P>

      <CalloutBox eyebrow="What to do about other apps">
        Open your phone&apos;s notification settings and silence push
        from anything that might spoil: ESPN, league apps, theScore,
        group chats, X, Bluesky, Threads. You can turn them back on
        after the game.
      </CalloutBox>

      <H2>Step 3. During the game</H2>
      <P>
        Open the app while you watch if you want a real-time companion.
        The score stays hidden. So do the scoring plays and the wrap on
        Today at the end of the night.
      </P>
      <P>
        Want to peek at the score? Tap the hidden score. It reveals that
        one game, not the whole page. It hides again on your next visit,
        unless you turn No-Spoilers off.
      </P>
      <P>
        Alerts keep their timing. An NFL touchdown push reads &quot;A
        touchdown was scored.&quot; and nothing more. On Companion, though,
        touchdown pushes only come for your own team, so the buzz itself is
        a hint. For a game you&apos;re saving, turn that follow&apos;s
        alerts off until you&apos;ve watched.
      </P>

      <H2>Step 4. When you&apos;re done</H2>
      <P>
        Watched the game? Turn No-Spoilers off in Settings. Or leave it on
        if you like the app calmer.
      </P>

      <H2>If you watch on delay regularly</H2>
      <P>
        Keep No-Spoilers on as your default. Reveal works one game at a
        time, so you can still follow a live game. Tap the score you want
        to see.
      </P>

      <P>
        More on the contract:{" "}
        <a href="/features/no-spoilers" style={linkStyle}>
          how No-Spoilers works
        </a>
        . Recording an NFL game?{" "}
        <a href="/nfl" style={linkStyle}>
          The NFL page
        </a>{" "}
        walks through the late game.
      </P>
    </ContentPageShell>
  );
}
