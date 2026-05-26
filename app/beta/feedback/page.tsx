import {
  ContentPageShell,
  H2,
  P,
} from "../../companion/landing/ContentPageShell";
import { BetaFeedbackForm } from "../../companion/beta/BetaFeedbackForm";

export const metadata = {
  title: "Beta feedback — No Noise Scores",
  description:
    "After a week of using the app, tell me what's working, what's broken, and what's missing.",
  alternates: {
    canonical: "https://nonoisescores.app/beta/feedback",
  },
  robots: { index: false, follow: false },
};

export default function BetaFeedbackPage() {
  return (
    <ContentPageShell
      eyebrow="Beta feedback"
      headline="Tell me what's working."
      intro="Three short fields. Be specific, be brutal, and don't be polite."
    >
      <P>
        You&apos;ve been using the app for at least a week. What does
        the app feel like? What feels right? What feels off? What
        isn&apos;t there yet?
      </P>

      <BetaFeedbackForm />

      <H2>What I&apos;m looking for</H2>
      <P>
        Specific moments. Not &quot;the app is calm&quot; but &quot;when
        I tapped into a finished game, the recap card felt like the
        right thing.&quot; Specific failures help more than generic
        praise.
      </P>
      <P>
        If something pissed you off, that&apos;s great too. I&apos;d
        rather know.
      </P>
    </ContentPageShell>
  );
}
