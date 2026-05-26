import {
  ContentPageShell,
  H2,
  P,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "Privacy — No Noise Scores",
  description:
    "What No Noise Scores collects, what we don't, and why. Plain English. No legal boilerplate.",
  alternates: { canonical: "https://nonoisescores.app/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPageShell
      eyebrow="Privacy"
      headline="What we collect."
      intro="Short list, plain English. Last updated May 2026."
    >
      <H2>The short version</H2>
      <P>
        Most of what you set in the app — follows, pinned games,
        No-Spoilers, alert levels — lives in your browser&apos;s
        localStorage, not on a server. We don&apos;t sell data, share it
        with advertisers, or track you across other sites.
      </P>

      <H2>What lives on your device</H2>
      <BulletList
        items={[
          "Your follows — teams, countries, series, tournaments.",
          "Your pinned games.",
          "Your No-Spoilers preference, alert tiers, quiet hours.",
          "Onboarding state (whether you've dismissed the first-run strip, install prompt, etc).",
          "First-run hints and small UI preferences.",
        ]}
      />
      <P>
        Clearing your browser data on your device clears all of this.
        We have no copy.
      </P>

      <H2>What lives on our servers</H2>
      <BulletList
        items={[
          "Web Push subscription endpoint (only if you enabled notifications) — required by the browser standard so we can send pushes to your device.",
          "Your enabled alert follows + tiers + No-Spoilers flag attached to that subscription — used by the push dispatcher to decide what to send you.",
          "If you subscribe to the No Noise Brief (email recap): your email, a hashed key, and your follow list at signup time.",
        ]}
      />
      <P>
        Push subscriptions are stored in Vercel KV (a Redis-style key/
        value store). Email subscribers are stored the same way, with
        SHA-256 hashed lookup keys and opaque unsubscribe tokens.
      </P>

      <H2>What we don&apos;t collect</H2>
      <BulletList
        items={[
          "No accounts. No passwords. No usernames.",
          "No location data.",
          "No contact lists.",
          "No advertising identifiers.",
          "No third-party analytics scripts running ad targeting.",
          "No cross-site tracking.",
        ]}
      />

      <H2>Analytics</H2>
      <P>
        We use Vercel Analytics and Vercel Speed Insights. These run on
        Vercel&apos;s infrastructure (the same hosting that serves the
        site) and they report aggregate page views and performance.
        They do not build user profiles, do not sell data, and do not
        require cookies on our end.
      </P>

      <H2>Notifications</H2>
      <P>
        If you turn on notifications, your browser creates a push
        subscription tied to your device. We store the endpoint so we
        can deliver alerts. You can revoke at any time from your
        browser&apos;s site settings, and the corresponding subscription
        on our side stops receiving anything.
      </P>

      <H2>The Brief</H2>
      <P>
        The morning Brief is opt-in. We send a personalized recap of
        yesterday&apos;s games for your follows. Every email has a
        one-click unsubscribe link in the footer. We do not share your
        email with anyone.
      </P>

      <H2>Children</H2>
      <P>
        No Noise Scores is not directed at children under 13. We do not
        knowingly collect any personal information from children.
      </P>

      <H2>Changes</H2>
      <P>
        If we materially change how we handle data, we&apos;ll update
        this page and call it out in the changelog.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about anything on this page? DM{" "}
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
        or email{" "}
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
        .
      </P>
    </ContentPageShell>
  );
}
