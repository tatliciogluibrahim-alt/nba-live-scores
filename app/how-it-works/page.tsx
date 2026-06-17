import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "How No Noise Scores works | No Noise Scores",
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
      <H2>1. Follow</H2>
      <P>
        A Follow is you telling the app what you care about. Teams.
        Countries. A specific playoff series. A tournament.
      </P>
      <P>
        Following something means it surfaces on Today. Your team&apos;s
        upcoming games show up. Your country&apos;s Summer Soccer path gets
        a page. Everything else stays quiet. Follows are unlimited and
        free.
      </P>

      <H2>2. Alert</H2>
      <P>
        Following is passive. Alerting is active. Turn alerts on for a
        follow and your phone buzzes when something happens. Three
        levels:
      </P>
      <BulletList
        items={[
          "Quiet. Start and final only.",
          "Companion. Start, key breaks, final.",
          "Full Details. Scores, close finishes, comebacks, big runs.",
        ]}
      />
      <P>
        Each follow owns its own level. Companion for the team you
        watch. Quiet for the rest. You can change them anytime.
      </P>

      <H2>3. Pin</H2>
      <P>
        Pinning is for a single game. Following is for a team or
        country across a whole season. Pin tonight&apos;s game when you
        want a focused tracking screen for it.
      </P>
      <P>
        Pinned games live on the{" "}
        <strong style={{ color: "var(--ink)" }}>Watching</strong> tab.
        Pinning doesn&apos;t turn on alerts. That&apos;s a separate
        switch on the follow.
      </P>

      <H3>Quick rule</H3>
      <BulletList
        items={[
          "Follow = personalize the app.",
          "Alert = notification-enabled follow.",
          "Pin = track a specific game on Watching.",
        ]}
      />

      <H2>4. No-Spoilers</H2>
      <P>
        Turn No-Spoilers on once in Alerts & Notifications. Scores,
        headlines, and outcomes blur across every screen. Push
        notification previews stay vague. Tap any blurred element to
        reveal it.
      </P>
      <P>
        Good for watching games on delay. The hide contract holds
        across the app. Share images, page titles, push previews. If
        you see a leak, that&apos;s a bug.
      </P>

      <CalloutBox eyebrow="That's it">
        Three tabs. Four ideas. No feed, no news section, no fifth
        concept hiding somewhere.
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
