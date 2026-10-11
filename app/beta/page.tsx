import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";
import { BetaSignupForm } from "../companion/beta/BetaSignupForm";
import { APP_STORE_URL } from "../lib/app-store";

export const metadata = {
  title: "Beta testing | No Noise Scores",
  description:
    "No Noise Scores is on the App Store. Help test what's next: leave your email, use it for real, and tell me what feels right and what doesn't.",
  alternates: { canonical: "https://nonoisescores.app/beta" },
};

// /beta — the testers page. The app is public on the App Store now, so
// this is no longer a gate to get in. What the signup form actually does
// (BetaSignupForm → /api/beta/signup): it records an email plus two
// free-text answers, sends no confirmation, and the follow-up is a manual
// note from Ibrahim. The copy promises exactly that and nothing more.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function BetaPage() {
  return (
    <ContentPageShell
      eyebrow="Beta"
      headline="Help me test what's next."
      intro="No Noise Scores is on the App Store and free for anyone. I'm also looking for people to try new things before they ship. If you're the kind of person who turns off ESPN notifications because they're too loud, I'd love your feedback."
    >
      <P>
        Testing means using it for real. Follow a team you actually care
        about, leave alerts on for a week, and tell me what feels right and
        what doesn&apos;t.
      </P>

      <H2>What you&apos;d get</H2>
      <BulletList
        items={[
          "A direct line to me. I read every reply.",
          "A note from me when there's something new to try.",
        ]}
      />

      <H2>What I&apos;d love from you</H2>
      <BulletList
        items={[
          "Get the app on your phone. On iPhone, that's the App Store.",
          "Follow something you actually care about.",
          "Leave alerts on for a week. Tell me if they hit at the right time.",
          "Try No-Spoilers for a game you watch on delay. Tell me if anything leaked.",
          "Brutal feedback welcome, especially if something feels generic.",
        ]}
      />

      <H2>Sign up</H2>
      <P>
        Leave your email and I&apos;ll reach out when there&apos;s something
        new to test.
      </P>
      <BetaSignupForm />
      <P>
        Prefer to DM? Reach{" "}
        <a
          href="https://instagram.com/nonoisescores"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          @nonoisescores
        </a>{" "}
        on Instagram or email{" "}
        <a href="mailto:nonoisescores@gmail.com" style={linkStyle}>
          nonoisescores@gmail.com
        </a>
        .
      </P>

      <H2>Already using it?</H2>
      <P>
        After a week of real use,{" "}
        <a href="/beta/feedback" style={linkStyle}>
          send feedback
        </a>
        . A few short fields, no marketing form energy.
      </P>

      <CalloutBox eyebrow="Getting it">
        On iPhone, the{" "}
        <a href={APP_STORE_URL} target="_blank" rel="noopener" style={linkStyle}>
          App Store app
        </a>{" "}
        is the simplest way in. You can also add the web app to your home
        screen from Safari. See the{" "}
        <a href="/guides/how-to-add-to-iphone-home-screen" style={linkStyle}>
          iPhone guide
        </a>{" "}
        for both. On Android or a computer, open it in any browser.
      </CalloutBox>
    </ContentPageShell>
  );
}
