import {
  ContentPageShell,
  H2,
  P,
  CompareTable,
  BulletList,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "No Noise Scores vs ESPN app — a calmer alternative",
  description:
    "ESPN is comprehensive and noisy. No Noise Scores is deliberately narrow and calm. Here's the honest comparison.",
  alternates: {
    canonical:
      "https://nonoisescores.app/compare/espn-app-alternative",
  },
};

export default function VsESPNPage() {
  return (
    <ContentPageShell
      eyebrow="Compare"
      headline="No Noise Scores vs the ESPN app."
      intro="ESPN is the everything-store of sports. This one is deliberately narrow. Here's how they compare."
    >
      <P>
        ESPN is the default for a reason — every sport, every league,
        every regular-season game, plus news, video, fantasy, social,
        and betting. That breadth is also where the noise comes from.
      </P>
      <P>
        No Noise Scores is for the opposite use case: when you want a
        sports companion for the moments you actually care about, not a
        news app.
      </P>

      <H2>The honest side-by-side</H2>
      <CompareTable
        headers={["", "ESPN app", "No Noise Scores"]}
        rows={[
          ["News feed", "Yes — front and center", "No"],
          ["Video clips", "Yes — autoplay-heavy", "No"],
          ["Fantasy modules", "Yes", "No"],
          ["Betting odds / spreads", "Yes — integrated", "No"],
          ["Social / comments", "Some", "No"],
          ["Push notifications", "Frequent, sometimes promotional", "Per-follow tier you control"],
          ["Sport breadth", "Every major sport, every season", "NBA Playoffs + World Cup + NFL coming"],
          ["No-Spoilers mode", "No", "End-to-end"],
          ["Editorial voice", "Headline-y, breaking-news flavor", "Calm, plain"],
          ["Ads", "Many", "None"],
        ]}
      />

      <H2>What you give up by switching</H2>
      <BulletList
        items={[
          "Most regular-season coverage outside NFL Sundays.",
          "Breaking news — this isn't a newsroom.",
          "Video highlights inside the app. What mattered shows up as short editorial bullets, not clips.",
          "Fantasy integration. Out of scope.",
          "Betting context. Won't ship — conflicts with the brand.",
        ]}
      />

      <H2>What you gain</H2>
      <BulletList
        items={[
          "Quiet. The app sits silent until something you follow matters.",
          "Editorial voice. \"Knicks took it.\" not \"Knicks SHOCK Cavaliers in stunning upset.\"",
          "Per-follow alert tiers. Calibrate noise per object, not in aggregate.",
          "No-Spoilers that actually holds. Hide everything across every screen — push previews included.",
          "Recap cards instead of feeds. After a game finishes, you get a calm artifact, not a stream of takes.",
          "Watching tab. Pin one game and have a focused tracker for the night.",
        ]}
      />

      <H2>Who shouldn&apos;t switch</H2>
      <P>
        If you actively want the news flavor — you check ESPN multiple
        times a day to see what&apos;s happening across every league —
        this app isn&apos;t for you. The narrow coverage would frustrate
        you.
      </P>
      <P>
        If you bet on games or play fantasy, you&apos;ll want to keep
        ESPN or DraftKings or whatever you use today. We&apos;re not a
        replacement for those tools.
      </P>

      <H2>Who should switch</H2>
      <P>
        Fans who watch their team and care about big moments — playoffs,
        World Cup, NFL Sundays — but who&apos;ve muted ESPN&apos;s
        notifications because they fire too often, or who close the
        app within seconds because the front page is overwhelming.
      </P>
      <P>
        Try No Noise Scores —{" "}
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
        </a>
        . You can keep ESPN installed too. They&apos;re not mutually
        exclusive.
      </P>
    </ContentPageShell>
  );
}
