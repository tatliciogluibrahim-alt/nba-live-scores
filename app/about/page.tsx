import {
  ContentPageShell,
  H2,
  P,
  Quote,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "About — No Noise Scores",
  description:
    "A calm sports companion for the moments that matter. Built deliberately narrow. No feeds, no ads, no noise.",
  alternates: { canonical: "https://nonoisescores.app/about" },
};

export default function AboutPage() {
  return (
    <ContentPageShell
      eyebrow="About"
      headline="A calm sports companion."
      intro="No Noise Scores is built around a single belief: sports apps got loud. We made one that didn't."
    >
      <P>
        Every modern sports app shows you scores. Most of them also show
        you news, hot takes, betting odds, fantasy projections, video
        clips, social-feed garbage, push notifications you didn&apos;t
        ask for, and a front-page algorithm tuned to keep you scrolling.
        We don&apos;t do any of that.
      </P>

      <P>
        We cover the sports moments that actually pull you to the
        screen — NBA Playoffs, the FIFA World Cup 2026, NFL when it
        arrives — and we shut up the rest of the time.
      </P>

      <H2>What the app does</H2>
      <BulletList
        items={[
          "Lets you Follow teams, countries, series, and tournaments.",
          "Sends per-follow alerts on three tiers: Quiet, Companion, All moments.",
          "Lets you Pin one game to Watching for that day's tracking.",
          "Hides scores end-to-end when you turn No-Spoilers on — push previews, headlines, share images, everything.",
          "Renders a Quiet Recap after each final game so you can catch up without a feed.",
          "Counts down to tournaments. Anchors country pages around your group's path.",
        ]}
      />

      <H2>What the app doesn&apos;t do</H2>
      <BulletList
        items={[
          "No news feed.",
          "No betting odds, no spread, no over-under.",
          "No fantasy modules.",
          "No social feed, no comments, no shares-as-a-feature.",
          "No regular-season filler.",
          "No FOMO-driven push notifications.",
          "No ads.",
          "No tracking beyond what we need to keep alerts working.",
        ]}
      />

      <H2>The voice</H2>
      <P>
        Editorial, calm, plain. We name the winner when it&apos;s
        finished. We say &quot;Knicks took it&quot; — not &quot;Knicks
        EXPLODE for stunning win.&quot; We say &quot;Game 7. Winner
        takes the series.&quot; — not &quot;DON&apos;T MISS the
        biggest game of the year.&quot;
      </P>
      <P>
        The visual language matches the voice. Cream backgrounds, ink
        type, mono numerals, restrained accents. We didn&apos;t
        accidentally end up there — every loud thing was removed.
      </P>

      <Quote>
        The product should feel like a calm sports control panel, not a
        feed. The day it has a viral surface is the day it becomes a
        noisy app.
      </Quote>

      <H2>Who&apos;s building it</H2>
      <P>
        Solo project by Ibrahim. The Brand is No Noise Scores. The
        domain is nonoisescores.app. Built mobile-first as a PWA — Add
        to Home Screen on iPhone or Android and it lives in your app
        drawer like a native app, with push notifications, full-screen
        chrome, and offline-friendly chassis.
      </P>

      <H2>What&apos;s next</H2>
      <P>
        See the public{" "}
        <a
          href="/changelog"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          changelog
        </a>{" "}
        for what&apos;s shipped, and the{" "}
        <a
          href="/beta"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          friend beta
        </a>{" "}
        page if you want in early.
      </P>
    </ContentPageShell>
  );
}
