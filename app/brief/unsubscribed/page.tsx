import Link from "next/link";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { Display } from "../../companion/atoms/Display";
import { Eyebrow } from "../../companion/atoms/Eyebrow";

export const metadata = {
  title: "Brief · Unsubscribed | No Noise Scores",
};

export default async function BriefUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const { headline, body, eyebrow } = (() => {
    switch (status) {
      case "ok":
        return {
          eyebrow: "Unsubscribed",
          headline: "You're off the list.",
          body: "No more brief emails. You can re-subscribe anytime from the app.",
        };
      case "already":
        return {
          eyebrow: "Already off",
          headline: "Already unsubscribed.",
          body: "This link was used already. Nothing more to do.",
        };
      case "missing":
        return {
          eyebrow: "Link issue",
          headline: "That link wasn't valid.",
          body: "If you got here from an email, the link may have been malformed. Reach out and we'll fix it.",
        };
      default:
        return {
          eyebrow: "Something went wrong",
          headline: "Couldn't unsubscribe.",
          body: "Try the link again in a minute. If it keeps failing, let us know.",
        };
    }
  })();

  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/" backLabel="Today" title="Brief" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Display as="h1" size="lg" className="mt-2">
          {headline}
        </Display>
        <p
          className="mt-3 text-[14px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {body}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Open Today
        </Link>
      </main>
    </CompanionFrame>
  );
}
