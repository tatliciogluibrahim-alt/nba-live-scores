import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";
import { BetaSignupForm } from "../companion/beta/BetaSignupForm";

export const metadata = {
  title: "Friend beta | No Noise Scores",
  description:
    "Help test No Noise Scores. Install it, follow your team, and tell me what feels right and what doesn't.",
  alternates: { canonical: "https://nonoisescores.app/beta" },
};

export default function BetaPage() {
  return (
    <ContentPageShell
      eyebrow="Beta"
      headline="Help me test it."
      intro="No Noise Scores is in friend beta. If you're the kind of person who turns off ESPN notifications because they're too loud, I'd love your feedback."
    >
      <P>
        I&apos;m looking for a small group of testers who&apos;ll use
        it for real. Follow a team or country you actually care about,
        install it on your phone, leave notifications on for a week,
        and tell me what feels right and what doesn&apos;t.
      </P>

      <H2>What you&apos;d get</H2>
      <BulletList
        items={[
          "Early access to every feature.",
          "Direct line to me. I read every reply.",
          "First look at whatever ships next.",
        ]}
      />

      <H2>What I&apos;d love from you</H2>
      <BulletList
        items={[
          "Install the app on your phone (home screen install).",
          "Follow something you actually care about.",
          "Leave alerts on for a week. Tell me if they hit at the right time.",
          "Try No-Spoilers for a game you watch on delay. Tell me if anything leaked.",
          "Brutal feedback welcome, especially if something feels generic.",
        ]}
      />

      <H2>Sign up</H2>
      <P>
        Drop your email below and I&apos;ll reach out when the next wave
        opens.
      </P>
      <BetaSignupForm />
      <P>
        Prefer to DM? Reach{" "}
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
        on Instagram or email{" "}
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
        .
      </P>

      <H2>Already in the beta?</H2>
      <P>
        After a week of real use,{" "}
        <a
          href="/beta/feedback"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          send feedback
        </a>
        . Three short fields, no marketing form energy.
      </P>

      <CalloutBox eyebrow="Heads up">
        On iPhone, push notifications only work after you add the site to
        your home screen. Open it in Safari, tap Share, then{" "}
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
        if you&apos;ve never done it before.
      </CalloutBox>
    </ContentPageShell>
  );
}
