import {
  ContentPageShell,
  H2,
  P,
  CalloutBox,
  CompareTable,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Follow vs Pin — what's the difference?",
  description:
    "Follow is for teams, countries, series. Pin is for one specific game. Here's how they work together.",
  alternates: {
    canonical: "https://nonoisescores.app/guides/follow-vs-pin",
  },
};

export default function FollowVsPinPage() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="Follow vs Pin."
      intro="The two things people mix up most. Related but separate."
    >
      <H2>Short version</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>Follow</strong> a team,
        country, series, or tournament. It personalizes the app and can
        send you alerts.
      </P>
      <P>
        <strong style={{ color: "var(--ink)" }}>Pin</strong> a specific
        game. It gives you a focused tracking screen on Watching for
        that game.
      </P>

      <H2>Side by side</H2>
      <CompareTable
        headers={["", "Follow", "Pin"]}
        rows={[
          ["What it's for", "Personalize the app long-term", "Track one specific game"],
          [
            "What you attach it to",
            "A team / country / series / tournament",
            "A single game",
          ],
          ["How many you can have", "Unlimited", "Multiple, but typically 1–3 at a time"],
          ["Where it shows up", "Today, Following", "Watching"],
          ["Sends notifications?", "Yes, if alerts are enabled", "No — pinning doesn't alert"],
          ["Disappears when?", "When you unfollow", "Automatically after the game ends"],
        ]}
      />

      <H2>How to think about it</H2>
      <P>
        Follow is the season-long relationship. You follow the Knicks
        because you care about the Knicks across an entire playoff run.
      </P>
      <P>
        Pin is the moment-level relationship. You pin tonight&apos;s
        Knicks game because you want a dedicated tracking surface for
        that specific game while it&apos;s happening.
      </P>

      <CalloutBox eyebrow="The Watching tab">
        Your Watching tab is the home for pinned games. If nothing is
        pinned, Watching is empty. Pin a game and it becomes your
        cockpit for that game — live score, what mattered, broadcast
        info, the works.
      </CalloutBox>

      <H2>How to follow</H2>
      <P>
        Open the app, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Following</strong> in
        the bottom nav. Tap the &quot;Add a follow&quot; row, pick a
        moment (NBA Playoffs, FIFA World Cup, etc.), then pick the
        team, country, series, or tournament you want to follow.
      </P>
      <P>
        After you add, the alert state is &quot;Alerts off&quot; by
        default. Tap the row to expand and pick a tier if you want push
        notifications. Three tiers: Quiet, Companion, All moments.
      </P>

      <H2>How to pin</H2>
      <P>
        Open any game page — tap a game card on Today, Following, or
        anywhere else. On the game page, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Pin to Watching</strong>.
        That game now lives in Watching until it ends.
      </P>
      <P>
        To unpin: open the same game page and tap the pin button again
        (it&apos;ll read &quot;Pinned · Tap to unpin&quot;).
      </P>

      <H2>Can I have both?</H2>
      <P>
        Yes. Most users will have follows + alerts for their team year-
        round, then pin specific games on game nights for focused
        tracking. They reinforce each other — your follows tell us what
        to surface and when to ping; your pin tells us what you&apos;re
        actively tracking right now.
      </P>

      <P>
        Once that&apos;s set up,{" "}
        <a
          href="/guides/watch-games-later-without-spoilers"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          here&apos;s how to use No-Spoilers
        </a>{" "}
        when you&apos;re watching on delay.
      </P>
    </ContentPageShell>
  );
}
