import {
  ContentPageShell,
  H2,
  P,
  CompareTable,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";
import { APP_STORE_URL } from "../../lib/app-store";

export const metadata = {
  title: "No Noise Scores vs Apple Sports | No Noise Scores",
  description:
    "Apple Sports is fast and OS-integrated. No Noise Scores is calm and editorial. Here's where each wins.",
  alternates: {
    canonical:
      "https://nonoisescores.app/compare/apple-sports-alternative",
  },
};

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

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
        different bet: editorial voice, per-follow alert levels, a real
        No-Spoilers mode, and the same app on iPhone and the web.
      </P>
      <P>
        Apple Sports is good at what it does. We&apos;re not trying to
        beat them at it. Different tools for different moods.
      </P>

      <H2>Where Apple Sports wins</H2>
      <CompareTable
        headers={["", "Apple Sports", "No Noise Scores"]}
        rows={[
          ["Speed", "Faster cold launch", "Fast, opening into Today"],
          [
            "OS integration",
            "Live Activities, Lock Screen widgets, watch complication",
            "Live Activities and Lock Screen widgets in the iPhone app",
          ],
          ["Sport breadth", "Many sports, all seasons", "The NFL season now, plus the moments as they come"],
          ["Install friction", "App Store, free, one tap", "App Store, free, one tap (or the web app)"],
          ["Distribution", "Apple's own app", "The App Store and the web, by word of mouth"],
        ]}
      />
      <P>
        If raw speed-to-score matters most to you, Apple Sports is the
        right pick. Their cold launch is faster. On OS integration the two
        now match: Live Activities and Lock Screen widgets ship in the No
        Noise Scores iPhone app too. What Apple Sports does not have is a
        spoiler mode. Notifications there are on or off. Here, the push
        preview itself stays vague until you tap.
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
            "End-to-end contract, push previews included",
          ],
          [
            "Series context",
            "Final score, basic series record",
            "Series dots, a stakes line, and a recap card with context",
          ],
          [
            "Country / tournament pages",
            "Bracket only",
            "Full country page with group, path-to-final, alerts",
          ],
          [
            "A tab for the games you're tracking",
            "Not available",
            "Watching, plus the Lock Screen on iPhone",
          ],
          [
            "Cross-platform",
            "iPhone / Apple Watch / Mac",
            "iPhone app, plus any device with a browser",
          ],
        ]}
      />

      <H2>How to pick</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          Pick Apple Sports if:
        </strong>{" "}
        you want scores across every major sport, you want them on your
        Apple Watch, or you don&apos;t need No-Spoilers.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>
          Pick No Noise Scores if:
        </strong>{" "}
        you watch games on delay, you want a different alert level for
        each team you follow, you mostly care about your team&apos;s NFL
        season, or you&apos;re tired of sports apps being noisy.
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
        <a href={APP_STORE_URL} target="_blank" rel="noopener" style={linkStyle}>
          Get it on the App Store
        </a>
        , or{" "}
        <a href="/app" style={linkStyle}>
          open it in your browser
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
