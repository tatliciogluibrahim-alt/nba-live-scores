import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
  CalloutBox,
  Quote,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "How No Noise Scores works",
  description:
    "Follow, Alert, Pin, No-Spoilers. Four concepts. That's the whole product.",
  alternates: { canonical: "https://nonoisescores.app/how-it-works" },
};

// The master manifesto page. Walks through Follow → Alert → Pin →
// No-Spoilers as one story. This is the page we'd link to on Twitter
// as the "what this app actually is" explainer.

export default function HowItWorksPage() {
  return (
    <ContentPageShell
      eyebrow="Manifesto"
      headline="How it works."
      intro="No Noise Scores is built around four concepts. Together, they make a calm sports companion that doesn't pretend to be a feed."
    >
      <Quote>
        We didn&apos;t build a smaller ESPN. We built a different kind
        of object — closer to a control panel than a feed.
      </Quote>

      <H2>1. Follow — your sports circle</H2>
      <P>
        A Follow is you saying &quot;I care about this thing.&quot; You
        can follow teams (Knicks), countries (USA in the World Cup),
        series (Knicks vs Cavaliers), and tournaments (NBA Playoffs).
        That set is your sports circle.
      </P>
      <P>
        Following something means the app knows to surface it. Your
        team&apos;s upcoming games appear on Today. Your country&apos;s
        path through the World Cup gets its own page. Your followed
        teams sort to the top of relevant lists.
      </P>
      <P>
        Following is unlimited. You can follow as many teams, countries,
        series, and tournaments as you want. The cost of following is
        zero — it just personalizes what you see.
      </P>

      <H2>2. Alert — turn it into a notification</H2>
      <P>
        Following is passive. Alerting is active. Turn alerts on for a
        follow and your phone will buzz when something happens.
      </P>
      <P>
        Three tiers, escalating in volume:
      </P>
      <BulletList
        items={[
          "Quiet — Start and final only.",
          "Companion — Start, key breaks, final.",
          "All moments — Key swings, close finishes, big leads erased.",
        ]}
      />
      <P>
        Each Follow owns its own tier. You might want{" "}
        <em>Companion</em> for the Knicks and{" "}
        <em>Quiet</em> for everything else. We make that easy.
      </P>
      <CalloutBox eyebrow="Why it matters">
        Most sports apps fire push notifications based on what they
        think you&apos;ll click. We fire them based on what you said
        you wanted. The difference is the difference between FOMO and a
        useful buzz.
      </CalloutBox>

      <H2>3. Pin — track one specific game</H2>
      <P>
        Pinning is different from Following. Following is about a team
        or country across the season. Pinning is about one specific
        game right now.
      </P>
      <P>
        You pin a game when you want a dedicated tracking surface for
        it — typically a game you&apos;re actively watching or about to
        watch. Pinned games appear on{" "}
        <strong style={{ color: "var(--ink)" }}>Watching</strong>, the
        third tab. Watching is your live cockpit for the day.
      </P>
      <P>
        Pinning is not the same as Alerting. You can pin a game without
        alerts (just want a quiet tracker), and you can alert on a team
        without pinning their game (just want the buzz).
      </P>
      <H3>Quick rule</H3>
      <BulletList
        items={[
          "Follow = personalize the app",
          "Alert = notification-enabled follow",
          "Pin = track one specific game in Watching",
        ]}
      />

      <H2>4. No-Spoilers — hide-by-default when you want</H2>
      <P>
        Turn No-Spoilers on once (Alerts & Notifications, top of the
        screen) and scores, headlines, and outcomes blur across every
        screen until you tap to reveal. We even rewrite push
        notification previews to stay vague.
      </P>
      <P>
        This is the feature most other apps fail. They hide the score
        but leak the winner in a thumbnail. Or hide the thumbnail but
        leak the score in a page title. Or hide both but their push
        preview reads &quot;FINAL: Knicks 110, Cavaliers 98.&quot;
      </P>
      <P>
        We&apos;ve audited the contract end-to-end. The promise is
        simple: if No-Spoilers is on, you choose what you see.
      </P>

      <H2>The whole product</H2>
      <P>
        That&apos;s the app. There&apos;s no fifth concept. There&apos;s
        no feed, no news section, no fantasy module, no betting tab.
        Three surfaces — Today, Following, Watching — and the four
        ideas above wired through them.
      </P>
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
