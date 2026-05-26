import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "How No Noise Scores works",
  description:
    "Follow, Alert, Pin, No-Spoilers. The four ideas that make up the app.",
  alternates: { canonical: "https://nonoisescores.app/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <ContentPageShell
      eyebrow="How it works"
      headline="Four ideas."
      intro="No Noise Scores is built around four ideas. They cover what the app does and what it doesn't."
    >
      <H2>1. Follow — your sports circle</H2>
      <P>
        A Follow is you telling the app &quot;I care about this thing.&quot;
        Teams (Knicks), countries (USA in the World Cup), specific series
        (Knicks vs Cavaliers), tournaments (NBA Playoffs).
      </P>
      <P>
        Following something means it surfaces on Today. Your team&apos;s
        upcoming games appear. Your country&apos;s World Cup path gets
        its own page. Following is unlimited and free.
      </P>

      <H2>2. Alert — turn it into a notification</H2>
      <P>
        Following is passive. Alerting is active. Turn alerts on for a
        follow and your phone buzzes when something happens. Three
        levels:
      </P>
      <BulletList
        items={[
          "Quiet — start and final only.",
          "Companion — start, key breaks, final.",
          "All moments — close finishes, comebacks, big runs.",
        ]}
      />
      <P>
        Each follow owns its own level. Companion for the team you watch,
        Quiet for the rest.
      </P>

      <H2>3. Pin — track one specific game</H2>
      <P>
        Pinning is for a single game. Following is for a team or country
        across the season. Pin tonight&apos;s game when you want a
        focused tracking screen for it.
      </P>
      <P>
        Pinned games live on the{" "}
        <strong style={{ color: "var(--ink)" }}>Watching</strong> tab.
        Pinning doesn&apos;t turn on alerts — that&apos;s a separate
        switch on the follow.
      </P>

      <H3>Quick rule</H3>
      <BulletList
        items={[
          "Follow = personalize the app",
          "Alert = notification-enabled follow",
          "Pin = track a specific game on Watching",
        ]}
      />

      <H2>4. No-Spoilers — hide-by-default when you want</H2>
      <P>
        Turn No-Spoilers on once in Alerts & Notifications and scores,
        headlines, and outcomes blur across every screen. Push
        notification previews stay vague. Tap any blurred element to
        reveal it.
      </P>
      <P>
        Good for watching games on delay. The contract holds across the
        app — share images, page titles, push previews. If you spot a
        leak, that&apos;s a bug, not a feature.
      </P>

      <CalloutBox eyebrow="That's it">
        Three surfaces (Today, Following, Watching) and four ideas. No
        fifth concept, no news section, no feed.
      </CalloutBox>

      <P>
        Open it{" "}
        <a
          href="/app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          here
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
