import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "Changelog | No Noise Scores",
  description:
    "Public version of what we ship. Editorial summaries, not git log dumps.",
  alternates: { canonical: "https://nonoisescores.app/changelog" },
};

// Changelog — public-facing editorial summary of what we ship. Mirrors
// app/CHANGELOG_PRODUCT.md but stripped of internal jargon and reframed
// for end users. Newest at top.
//
// Keep entries short, plain, and honest. Each release is one H3 with
// the month, plus a brief P and a BulletList of changes.

export default function ChangelogPage() {
  return (
    <ContentPageShell
      eyebrow="Changelog"
      headline="What shipped."
      intro="Most recent on top."
    >
      <H2>2026</H2>

      <H3>May. Stakes, recap, brief.</H3>
      <P>
        Three features that turn the app from a calm scoreboard into a
        calm sports companion.
      </P>
      <BulletList
        items={[
          "Stakes lines on game and country pages: \"X can close the series with one more win.\" / \"Game 7. Winner takes the series.\"",
          "Quiet Recap Card. A final-game artifact: winner-named headline, big score, what mattered, optional next game.",
          "No Noise Brief. Personalized morning email recap. Code complete; live send gated on domain email setup.",
          "Tournament and team detail pages.",
          "WC country navigation: back to all-countries from a country page.",
        ]}
      />

      <H3>May. World Cup pre-kickoff readiness.</H3>
      <P>
        Tightens the 30-day run-up to June 11. The tournament-countdown
        component now carries the country page across the full
        pre-kickoff window, with intensity tiers that escalate as
        kickoff approaches.
      </P>
      <BulletList
        items={[
          "Today brief surfaces a calm awareness band 8–30 days out.",
          "Kickoff-day Today hero takes over the slot in the last 24 hours.",
          "Country alert state pill confirms the user's current alert tier passively.",
          "WC country notifications cron. Kickoff and full-time pushes for country follows.",
        ]}
      />

      <H3>Apr–May. Phases 1–7.</H3>
      <P>
        A consolidated pass across navigation, Today calmness, game
        detail hierarchy, country detail copy, alert controls, snapshot
        fallback, and small visual calibration.
      </P>
      <BulletList
        items={[
          "Object-detail navigation across Today, Following, game / country / series pages.",
          "Today's pinned-state redundancy cleanup.",
          "Game detail hierarchy: consolidated Series block, refined pin states.",
          "Country detail pre-tournament polish.",
          "Compact per-follow alert controls in Alerts & Notifications.",
          "Final-game snapshot fallback so historical games never dead-end.",
          "Pinned orange accent on Today UpNext; slightly larger chip tap targets.",
        ]}
      />

      <H2>Earlier</H2>
      <P>
        Bricolage Grotesque + Inter + JetBrains Mono shipped as the
        type system. Two-orange rule. Cream/paper visual system locked
        in. Three-tier preset model (Quiet / Companion / Full Details)
        for per-follow alerts. SevenDotStrip and PathTimeline as
        signature components.
      </P>

      <H2>What&apos;s coming</H2>
      <P>
        The Brief launches once we sort the domain email situation.
        NFL ships in August 2026 ahead of the season opener. Dark
        mode (warm dark, not generic dark) is in the queue. See the
        public{" "}
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
        if you want to be on the next wave.
      </P>
    </ContentPageShell>
  );
}
