import {
  ContentPageShell,
  H2,
  P,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "About | No Noise Scores",
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
        Most sports apps cover everything and show it all the same way.
        News, hot takes, fantasy widgets, betting odds, and a push for every
        update. Finding your team&apos;s score means getting past all of it.
      </P>

      <P>
        This one is narrower on purpose. It covers the events that pull
        you to the screen. Right now that&apos;s the NFL season. Earlier
        this year it was the NBA Playoffs and Summer Soccer 2026. The rest
        of the time it stays quiet.
      </P>

      <H2>What it does</H2>
      <BulletList
        items={[
          "Lets you follow teams, countries, series, and tournaments.",
          "Sends per-follow alerts at three levels: Quiet, Companion, Full Details.",
          "Lets you add a game to Watching, or put its live score on your iPhone Lock Screen.",
          "Hides scores, headlines, and results on every screen when you want. Push notification previews stay vague.",
          "Shows a recap after a game ends so you can catch up without a feed.",
          "Lays out the full schedule: by week for the NFL, by day for a tournament.",
          "Sends a morning Brief by email, if you want one.",
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
        Solo project by Ibrahim. It&apos;s on the App Store for iPhone, and
        it runs in any browser on Android and computers. Push notifications
        work in both.
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
          href="mailto:nonoisescores@gmail.com"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          nonoisescores@gmail.com
        </a>
        . Real questions, real feedback, anything.
      </P>
    </ContentPageShell>
  );
}
