import {
  ContentPageShell,
  H2,
  P,
  CalloutBox,
  CompareTable,
} from "../../companion/landing/ContentPageShell";

export const metadata = {
  title: "Follow vs Watching | No Noise Scores",
  description:
    "Follow is for teams, countries, series, and tournaments. Watching is for one game at a time. Here's how they work together.",
  alternates: {
    canonical: "https://nonoisescores.app/guides/follow-vs-pin",
  },
};

// The slug stays /guides/follow-vs-pin (existing URLs keep their slugs),
// but "Pin" is a dead word in the app since 2026-07-03. The verbs are
// "Add to Watching" (web) and "Track on Lock Screen" (iPhone app, live
// game). Facts below, read off the code:
// • Alerts on at add for the first three follows (providers.tsx
//   addFollow: alertEnabled = active alert slots < 3). New NFL follows
//   start on Quiet (state/moments.ts defaultAlertTierForMoment).
// • Finished games leave Watching about 24 hours after the final
//   (watching-data.ts WATCHING_FINAL_TTL_MS). Three Lock Screen slots
//   (system/lock-screen-slots.ts).
// • Held-state labels quoted from game/TrackControl.tsx.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function FollowVsPinPage() {
  return (
    <ContentPageShell
      eyebrow="Guide"
      headline="Follow vs Watching."
      intro="The two things people mix up most. Related but separate."
    >
      <H2>Short version</H2>
      <P>
        <strong style={{ color: "var(--ink)" }}>Follow</strong>{" "}
        a team,
        country, series, or tournament. It personalizes the app and can
        send you alerts.
      </P>
      <P>
        Add a specific game to{" "}
        <strong style={{ color: "var(--ink)" }}>Watching</strong>. It
        keeps that game in view while it&apos;s on. In the iPhone app, it
        can sit on your Lock Screen too.
      </P>

      <H2>Side by side</H2>
      <CompareTable
        headers={["", "Follow", "Watching"]}
        rows={[
          ["What it's for", "Personalize the app long-term", "Keep one game in view"],
          [
            "What you attach it to",
            "A team, country, series, or tournament",
            "A single game",
          ],
          ["How many you can have", "Unlimited", "Several. Up to 3 on the iPhone Lock Screen at once"],
          ["Where it shows up", "Today, Following", "Watching, and the Lock Screen on iPhone"],
          ["Sends notifications?", "Yes, if alerts are on", "No. Watching doesn't send alerts"],
          ["Disappears when?", "When you unfollow", "About a day after the game ends"],
        ]}
      />

      <H2>How to think about it</H2>
      <P>
        Follow is the season-long relationship. You follow the Lions
        because you care about the Lions all season.
      </P>
      <P>
        Watching is for the moment. You add Sunday&apos;s Lions game to
        Watching because you want it in view while it&apos;s happening.
      </P>

      <CalloutBox eyebrow="The Watching tab">
        Watching holds the games you&apos;ve added. Live games sit at the
        top with the score and the clock. Later games wait below. A
        finished game clears about a day after the final.
      </CalloutBox>

      <H2>How to follow</H2>
      <P>
        Open the app and tap{" "}
        <strong style={{ color: "var(--ink)" }}>Following</strong>, in the
        tab bar on your phone or the sidebar on a computer. Tap{" "}
        <strong style={{ color: "var(--ink)" }}>Add follow</strong>, pick a
        moment, like the NFL, then pick the team, country, series, or
        tournament you want to follow.
      </P>
      <P>
        Your first three follows get alerts as soon as you add them. A new
        NFL follow starts on Quiet. Tap any follow to change its level:
        Quiet, Companion, or Full Details. After three, a new follow starts
        with alerts off. Your phone also needs notifications turned on for
        the app. The app asks once.
      </P>

      <H2>How to add a game to Watching</H2>
      <P>
        Open any game page. Tap a game on Today, Schedule, or anywhere
        else. On the game page, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Watching</strong>.
        In the iPhone app, a live game&apos;s button reads{" "}
        <strong style={{ color: "var(--ink)" }}>Track on Lock Screen</strong>
        , which adds it to Watching and puts the live score on your Lock
        Screen.
      </P>
      <P>
        To remove it, open the same game page and tap the button again. It
        reads &quot;In Watching · tap to remove&quot; on the web, or
        &quot;On your lock screen · tap to remove&quot; in the iPhone app.
      </P>

      <H2>Can I have both?</H2>
      <P>
        Yes. Follow your team with alerts all season, then add a game to
        Watching on the day you want to keep an eye on it. Your follows
        decide what shows up and when your phone buzzes. Watching holds
        what you&apos;re tracking right now.
      </P>

      <P>
        Once that&apos;s set up,{" "}
        <a href="/guides/watch-games-later-without-spoilers" style={linkStyle}>
          here&apos;s how to use No-Spoilers
        </a>{" "}
        when you&apos;re watching on delay.
      </P>
    </ContentPageShell>
  );
}
