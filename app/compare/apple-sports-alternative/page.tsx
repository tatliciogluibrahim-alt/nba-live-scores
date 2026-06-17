import {
  ContentPageShell,
  H2,
  P,
  CompareTable,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "No Noise Scores vs Apple Sports | No Noise Scores",
  description:
    "Apple Sports is fast and OS-integrated. No Noise Scores is calm and editorial. Here's where each wins.",
  alternates: {
    canonical:
      "https://nonoisescores.app/compare/apple-sports-alternative",
  },
};

export default function VsAppleSportsPage() {
  return (
    <ContentPageShell
      eyebrow="Compare"
      headline="No Noise Scores vs Apple Sports."
      intro="Two calm sports apps with different bets. Here's an honest read on where each one fits."
    >
      <P>
        Apple Sports launched in 2024 with a clear bet: fast, clean,
        scores-first, deeply integrated with iOS. This one made a
        different bet: editorial voice, per-follow alert levels, real
        No-Spoilers mode, web-first.
      </P>
      <P>
        Apple Sports is good at what it does. We&apos;re not trying to
        beat them at it. Different tools for different moods.
      </P>

      <H2>Where Apple Sports wins</H2>
      <CompareTable
        headers={["", "Apple Sports", "No Noise Scores"]}
        rows={[
          ["Speed", "Faster cold launch", "Fast, but a PWA opening into Today"],
          [
            "OS integration",
            "Live Activities, Lock Screen widgets, watch complication",
            "PWA. No Live Activities on iOS.",
          ],
          ["Sport breadth", "Many sports, all seasons", "NBA Playoffs + Summer Soccer + NFL coming"],
          ["Install friction", "App Store, free, one tap", "Add to Home Screen on iPhone"],
          ["Distribution", "Pre-installed-ish on iPhone", "Web link, share-of-mouth"],
        ]}
      />
      <P>
        If raw speed-to-score and OS integration matter most to you,
        Apple Sports is the right pick. They have advantages we
        structurally can&apos;t match (iOS Live Activities aren&apos;t
        available to web apps).
      </P>

      <H2>Where No Noise Scores wins</H2>
      <CompareTable
        headers={["", "Apple Sports", "No Noise Scores"]}
        rows={[
          [
            "Per-follow alert tiers",
            "On/off per team",
            "Three tiers per follow: Quiet, Companion, Full Details",
          ],
          [
            "Editorial voice",
            "Sterile: \"NYK 110, BOS 102. Final\"",
            "Calm: \"Knicks took it.\" + what mattered bullets",
          ],
          [
            "No-Spoilers mode",
            "Not available",
            "End-to-end contract; push previews stay vague too",
          ],
          [
            "Series context",
            "Final score, basic series record",
            "SevenDotStrip, stakes line, recap card with context",
          ],
          [
            "Country / tournament pages",
            "Bracket only",
            "Full country page with group, path-to-final, alerts",
          ],
          [
            "Pin one game for the day",
            "Not available",
            "Dedicated Watching surface for pinned game",
          ],
          [
            "Cross-platform",
            "iPhone / Apple Watch / Mac",
            "Any device with a browser",
          ],
        ]}
      />

      <H2>How to pick</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          Pick Apple Sports if:
        </strong>{" "}
        you live on iPhone, you mostly want scores and Live Activities,
        you don&apos;t need No-Spoilers, you follow more sports than
        this app covers, or you prefer one-tap App Store install.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          Pick No Noise Scores if:
        </strong>{" "}
        you want editorial voice, you watch games on delay, you want
        per-follow alert nuance, you&apos;re focused on NBA Playoffs +
        Summer Soccer (or you&apos;re tired of sports apps being noisy), or
        you don&apos;t mind a PWA install for a calmer experience.
      </P>

      <CalloutBox eyebrow="Honest take">
        You can use both. Apple Sports for widget-level glance, this one
        for the games you&apos;re actually living through.
      </CalloutBox>

      <H2>What this app won&apos;t copy from Apple Sports</H2>
      <P>
        Their scope. Apple Sports covers every major sport. This one
        stays narrow on purpose, going deep on the moments that matter
        instead of wide on every season.
      </P>

      <P>
        Try No Noise Scores.{" "}
        <a
          href="/app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          open the app
        </a>{" "}
        or{" "}
        <a
          href="/guides/how-to-add-to-iphone-home-screen"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          add it to your iPhone home screen
        </a>{" "}
        first.
      </P>
    </ContentPageShell>
  );
}
