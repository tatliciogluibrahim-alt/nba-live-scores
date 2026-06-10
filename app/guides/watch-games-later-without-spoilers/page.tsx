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

export default function WatchLaterGuide() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="Watch on delay. Skip the spoilers."
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
        Open the app. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>
          Alerts & Notifications
        </strong>{" "}
        in the bottom nav. Toggle{" "}
        <strong style={{ color: "var(--ink)" }}>No-Spoilers</strong> at
        the top of the screen.
      </P>
      <P>
        That&apos;s the one switch. From this point forward, every
        score, headline, series state, and recap is blurred until you
        tap to reveal. Push notification bodies stay vague.
      </P>

      <H2>Step 2. Confirm the contract</H2>
      <P>
        Before you start the game, spot-check the contract:
      </P>
      <BulletList
        items={[
          "Open Today. You should see a small muted dot in the header indicating No-Spoilers is on.",
          "Tap into any game you've already played. Score should be blurred. Headline should be \"Game wrapped.\" not \"X took it.\"",
          "Tap your team's series page. Series state should be \"Series context hidden.\" not \"NY leads 3-1.\"",
          "If you have alerts on, the next push you get should not name a score or winner.",
        ]}
      />
      <P>
        Anything leaks? Tell us. The contract is end-to-end on purpose.
      </P>

      <CalloutBox eyebrow="What to do about other apps">
        Open your phone&apos;s notification settings and silence push
        from anything that might spoil: ESPN, NBA, theScore,
        group chats, Twitter / X, Bluesky, Threads. You can re-enable
        after the game.
      </CalloutBox>

      <H2>Step 3. During the game</H2>
      <P>
        Open the app while you watch if you want a real-time companion.
        The score stays blurred. Series state stays hidden. The Quiet
        Recap card that fires at the end of the night stays hidden too.
      </P>
      <P>
        Want to peek at the score? Tap the blurred number. It
        reveals just that one element, not the whole page. The blur
        comes back on the next visit unless you turn No-Spoilers off.
      </P>

      <H2>Step 4. When you&apos;re done</H2>
      <P>
        Watched the game? Turn No-Spoilers off in{" "}
        <strong style={{ color: "var(--ink)" }}>
          Alerts & Notifications
        </strong>
        . You don&apos;t need to leave it on. Though many users do
        because it keeps the app calmer overall.
      </P>

      <H2>If you watch on delay regularly</H2>
      <P>
        Keep No-Spoilers on as your default. The reveal mechanic per
        element means you can use the app live too. Just tap any score
        you want to see. The &ldquo;hide first, reveal on demand&rdquo; model is
        actually the right default for anyone who finds sports apps
        overwhelming, not just delay-watchers.
      </P>

      <P>
        More on the contract:{" "}
        <a
          href="/features/no-spoilers"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          how No-Spoilers actually works
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
