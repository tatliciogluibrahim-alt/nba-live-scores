import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "No-Spoilers — No Noise Scores",
  description:
    "Hide scores, headlines, and outcomes across every screen. Push notification previews stay vague.",
  alternates: { canonical: "https://nonoisescores.app/features/no-spoilers" },
};

export default function NoSpoilersPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Watch on delay. Skip the spoilers."
      intro="Recorded the game? Watching it later? No-Spoilers blurs scores, headlines, and outcomes across every screen until you choose to look."
    >
      <P>
        You recorded the game. You&apos;ll watch it tonight. You open a
        sports app and within three seconds you see the final score in a
        thumbnail, the winner in a headline, or a push notification on
        the lock screen. Night ruined.
      </P>
      <P>
        No-Spoilers in this app tries to hold the contract end-to-end —
        scores, push previews, share images, all of it.
      </P>

      <H2>What gets hidden</H2>
      <BulletList
        items={[
          "Scores on every screen.",
          "Series state (\"X leads 3-1\") on game and series pages.",
          "Recap headlines that name the winner.",
          "\"What mattered\" bullets that reveal outcome.",
          "Push notification body text — rewritten to stay vague (e.g. \"Quarter wrapped. Tap to check in.\").",
          "Close-game and comeback alerts — skipped entirely.",
          "End-of-night recap cards on Today.",
        ]}
      />

      <H2>What stays visible</H2>
      <P>
        Structural info stays — that a game is{" "}
        <em>final</em>, that a series is best-of-seven, that there&apos;s
        a Game 7. Team and country codes stay too, so you can still find
        what you&apos;re looking for.
      </P>

      <CalloutBox eyebrow="Reveal">
        Tap any blurred element to reveal it. Per-element, not
        per-screen. You can reveal one score without revealing every
        other score on the page.
      </CalloutBox>

      <H2>How to turn it on</H2>
      <P>
        Open the app, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Alerts & Notifications</strong>{" "}
        in the bottom nav. Toggle{" "}
        <strong style={{ color: "var(--ink)" }}>No-Spoilers</strong> at
        the top. That&apos;s the whole switch — it stays on across visits
        until you turn it off.
      </P>
      <P>
        A small muted dot on Today shows when it&apos;s on, so you know
        at a glance.
      </P>

      <H2>Use cases</H2>
      <BulletList
        items={[
          "You record games and watch them at night.",
          "You're at work during a playoff afternoon.",
          "World Cup match you can't watch live.",
          "You missed the live window and want to watch the replay fresh.",
        ]}
      />

      <P>
        Try it in the{" "}
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
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
