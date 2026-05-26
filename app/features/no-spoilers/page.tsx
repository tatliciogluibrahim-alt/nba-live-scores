import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
  Quote,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "No-Spoilers — No Noise Scores",
  description:
    "Hide scores, headlines, and outcomes across every screen — push previews included. Watch games on delay without leaks.",
  alternates: { canonical: "https://nonoisescores.app/features/no-spoilers" },
};

export default function NoSpoilersPage() {
  return (
    <ContentPageShell
      eyebrow="Feature"
      headline="Watch on delay. Don't get spoiled."
      intro="No-Spoilers is the most-asked-for feature in sports apps. Most attempts fail. Ours is the contract done right."
    >
      <P>
        You recorded the game. You&apos;ll watch it tonight after the
        kids are down. You open a sports app — any sports app — and
        within three seconds you see the final score in a thumbnail,
        the winner in a headline, or a push notification preview on
        your lock screen. The night is ruined.
      </P>
      <P>
        Every major sports app has either (a) no hide-score feature, or
        (b) one that leaks. We built ours assuming you&apos;ll test it
        for failure modes.
      </P>

      <H2>What gets hidden when No-Spoilers is on</H2>
      <BulletList
        items={[
          "Scores on every screen — Today, Following, Watching, game detail.",
          "Series state (\"NY leads 3–1\") on game and series pages.",
          "Recap card headlines naming the winner (\"Knicks took it.\").",
          "What mattered bullets that reveal outcome (\"Brunson 32 PTS\").",
          "Push notification body text — rewritten to stay vague (\"Quarter wrapped. Tap to check in.\").",
          "Close-game and comeback alerts — suppressed entirely.",
          "Quiet Recap end-of-night cards on Today.",
        ]}
      />

      <H2>What stays visible (and why)</H2>
      <P>
        Structural information stays. The fact that a game is{" "}
        <em>final</em> stays visible — without it, you couldn&apos;t
        navigate the app. The fact that a series is best-of-seven
        stays. Tournament structure stays. Team and country codes stay.
      </P>
      <P>
        Outcome stays hidden until you tap to reveal.
      </P>

      <CalloutBox eyebrow="How reveal works">
        Tap any blurred element to reveal that single piece. The reveal
        is per-element, not per-screen. So you can reveal one score
        without revealing every other score on the page. Your mode stays
        on for the next game.
      </CalloutBox>

      <H2>The contract, end-to-end</H2>
      <P>
        We audit this regularly because the contract only works if it
        holds everywhere:
      </P>
      <BulletList
        items={[
          "Page titles never include scores.",
          "Browser tab titles never include scores.",
          "Open Graph share images for past games stay generic.",
          "Push notification previews use spoiler-safe copy.",
          "First-paint rendering blurs spoilery cells before the user can see them.",
          "AI-search-engine snippets surface the spoiler-safe copy, not the score.",
        ]}
      />

      <H2>How to turn it on</H2>
      <P>
        Open the app, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Alerts & Notifications</strong>{" "}
        in the bottom nav (or the settings icon). Toggle{" "}
        <strong style={{ color: "var(--ink)" }}>No-Spoilers</strong> at
        the top. That&apos;s it. The mode stays on across visits until
        you turn it off.
      </P>
      <P>
        A small muted dot appears on Today when the mode is on, so you
        can always see at a glance &quot;ah, I&apos;m hidden right
        now.&quot;
      </P>

      <Quote>
        Spoiler-safety is a contract. The minute you break it once, the
        user can&apos;t trust the feature again. We treat it as
        end-to-end product policy, not a UI toggle.
      </Quote>

      <H2>The use cases we built it for</H2>
      <BulletList
        items={[
          "You record games and watch them at night.",
          "You're at work during a playoff afternoon.",
          "You can't watch a World Cup match live and don't want to spoil it on the train home.",
          "You're at a wedding when your team plays Game 7 and you'll watch the replay tomorrow.",
          "You missed the live window and want to watch the recap as if it just happened.",
        ]}
      />
      <P>
        If any of those match your life, this feature is for you.{" "}
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
        </a>{" "}
        and try it.
      </P>
    </ContentPageShell>
  );
}
