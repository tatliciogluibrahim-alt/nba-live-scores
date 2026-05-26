import {
  ContentPageShell,
  H2,
  P,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "About — No Noise Scores",
  description:
    "A calm sports companion for the moments that matter. Built by one person, kept narrow on purpose.",
  alternates: { canonical: "https://nonoisescores.app/about" },
};

export default function AboutPage() {
  return (
    <ContentPageShell
      eyebrow="About"
      headline="A calm sports companion."
      intro="No Noise Scores is a small sports app I'm building for the games I actually want to watch."
    >
      <P>
        Most sports apps cover everything and surface it all the same.
        News, hot takes, fantasy widgets, betting odds, push notifications
        every five minutes. By the time you find your team&apos;s score, the app
        has already taken twenty seconds of your attention.
      </P>

      <P>
        This one is narrower on purpose. It covers the events that pull
        you to the screen — NBA Playoffs, the FIFA World Cup, NFL when it
        gets here — and it stays quiet the rest of the time.
      </P>

      <H2>What it does</H2>
      <BulletList
        items={[
          "Lets you follow teams, countries, series, and tournaments.",
          "Sends per-follow alerts at three levels: Quiet, Companion, All moments.",
          "Lets you pin a specific game to Watching for the night.",
          "Hides scores, headlines, and outcomes across every screen when you want — push notification previews stay vague.",
          "Shows a recap card after a game ends so you can catch up without a feed.",
          "Counts down to tournaments. Anchors country pages around your group.",
        ]}
      />

      <H2>What it doesn&apos;t do</H2>
      <BulletList
        items={[
          "No news feed.",
          "No betting odds, spread, or over-under.",
          "No fantasy.",
          "No social feed, no comments.",
          "No ads.",
          "No re-engagement push notifications.",
        ]}
      />

      <H2>Who&apos;s building it</H2>
      <P>
        Solo project by Ibrahim. Built mobile-first as a Progressive Web
        App — install it on your phone, it acts like a regular app with
        push notifications and a home-screen icon.
      </P>

      <H2>Get in touch</H2>
      <P>
        DM{" "}
        <a
          href="https://instagram.com/nonoisescores"
          target="_blank"
          rel="noreferrer"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          @nonoisescores
        </a>{" "}
        on Instagram, or email{" "}
        <a
          href="mailto:tatlicioglu.ibrahim@gmail.com"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          tatlicioglu.ibrahim@gmail.com
        </a>
        . Real questions, real feedback, anything.
      </P>
    </ContentPageShell>
  );
}
