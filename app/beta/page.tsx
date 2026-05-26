import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "Friend beta — No Noise Scores",
  description:
    "Get in early. Help us pressure-test the calm sports companion.",
  alternates: { canonical: "https://nonoisescores.app/beta" },
};

export default function BetaPage() {
  return (
    <ContentPageShell
      eyebrow="Beta"
      headline="Be early. Be useful."
      intro="No Noise Scores is in friend beta. If you're the kind of fan who turns off ESPN notifications because they're too loud, you're who we're building for."
    >
      <P>
        We&apos;re looking for a small group of testers who will use the
        app for real — follow a team or country they actually care
        about, install it as a PWA, leave notifications on for a week,
        and tell us what feels right and what doesn&apos;t.
      </P>

      <H2>What you&apos;ll get</H2>
      <BulletList
        items={[
          "Early access to every feature.",
          "Direct line to the builder. We read every reply.",
          "Whatever we ship next, you see it first.",
        ]}
      />

      <H2>What we&apos;d love from you</H2>
      <BulletList
        items={[
          "Install the PWA on your phone for at least a week. Yes, the home screen install.",
          "Follow something you actually care about — Knicks playoff games, your country in the World Cup, etc.",
          "Leave alerts on. We need to know if they hit at the right time, not the right minute later.",
          "Try No-Spoilers for one game you watch on delay. Tell us if anything leaked.",
          "Pressure-test the brand voice: does it feel calm, or does it feel sterile? Specific feedback wins.",
          "Be brutal. Especially about anything that feels generic. Generic is the worst thing this app could become.",
        ]}
      />

      <H2>How to join</H2>
      <P>
        For now the beta runs by word of mouth — DM Ibrahim, email,
        Signal, whatever your line is. A proper sign-up form lands in
        the next release wave.
      </P>

      <CalloutBox eyebrow="Heads up">
        On iPhone, push notifications only work after you Add to Home
        Screen. Open the site in Safari, tap Share, then{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Home Screen</strong>.
        See the{" "}
        <a
          href="/guides/how-to-add-to-iphone-home-screen"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          install guide
        </a>{" "}
        for the steps.
      </CalloutBox>

      <H2>What we&apos;re NOT looking for</H2>
      <BulletList
        items={[
          "Testers who install once and forget. We need real users, not signature collectors.",
          "Feature lists. The whole point is what we don't build.",
          "Comparisons to ESPN in the form of \"why don't you have X?\" — usually the answer is \"because it would make the app loud.\"",
        ]}
      />

      <P>
        If that all sounds right, we&apos;d love to have you. Reach out
        through whatever channel got you here.
      </P>
    </ContentPageShell>
  );
}
