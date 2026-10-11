import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "No-Spoilers | No Noise Scores",
  description:
    "Hide scores, headlines, and results across every screen. Push notification previews stay vague.",
  alternates: { canonical: "https://nonoisescores.app/features/no-spoilers" },
};

// The feature page. Its H1 is its own: the watch-later guide owns the
// step-by-step. Push copy below is quoted verbatim from the dispatcher's
// No-Spoilers templates (NFL touchdown, NBA quarter break).

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function NoSpoilersPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="The score stays hidden until you say so."
      intro="Recorded the game? Watching it later? No-Spoilers hides scores, headlines, and results on every screen until you choose to look."
    >
      <P>
        You recorded the game. You&apos;ll watch it tonight. You open a
        sports app and the final score is right there, in a thumbnail, a
        headline, or a push notification on the lock screen. Night ruined.
      </P>
      <P>
        No-Spoilers in this app tries to hold the contract end to end.
        Scores, push previews, share images, all of it.
      </P>

      <H2>What gets hidden</H2>
      <BulletList
        items={[
          "Scores on every screen, including the Lock Screen in the iPhone app. In the app, they turn into placeholder dots.",
          "Scoring plays and top performers on NFL game pages.",
          "Series state (\"X leads 3-1\") on NBA game and series pages.",
          "Recap headlines that name the winner.",
          "Push notification text. An NFL touchdown push reads \"A touchdown was scored.\" with no score and no player. An NBA quarter break reads \"Quarter wrapped. Tap to check in.\"",
          "Close-game and comeback alerts. Skipped entirely.",
          "End-of-night recaps on Today.",
        ]}
      />

      <H2>What stays visible</H2>
      <P>
        Structural info stays. That a game is{" "}
        <em>final</em>, which week of the NFL season it is, that a series is
        best-of-seven, that there&apos;s a Game 7. Team and country codes
        stay too, so you can still find what you&apos;re looking for.
      </P>

      <CalloutBox eyebrow="Reveal">
        Tap a hidden score to reveal that one game. Revealing one score
        doesn&apos;t reveal the others on the page, and it only lasts for
        that visit.
      </CalloutBox>

      <H2>How to turn it on</H2>
      <P>
        Open Settings. On your phone, it&apos;s at the bottom of the
        Following tab. On a computer, it&apos;s in the sidebar. Turn on{" "}
        <strong style={{ color: "var(--ink)" }}>No-Spoilers</strong>{" "}
        at the top. That&apos;s the whole switch. It stays on across visits
        until you turn it off.
      </P>
      <P>
        A small muted dot on Today shows when it&apos;s on, so you know
        at a glance.
      </P>
      <P>
        Only want it for one team? Tap that follow in Following and hide
        spoilers for just that follow.
      </P>

      <H2>Use cases</H2>
      <BulletList
        items={[
          "You record the 4:25 NFL game and watch it after dinner.",
          "You're at work during a playoff game.",
          "You missed the live window and want to watch the replay fresh.",
        ]}
      />

      <P>
        Recording an NFL game?{" "}
        <a href="/nfl" style={linkStyle}>
          Here&apos;s how it works for the NFL
        </a>
        . Or try it in the{" "}
        <a href="/app" style={linkStyle}>
          app
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
