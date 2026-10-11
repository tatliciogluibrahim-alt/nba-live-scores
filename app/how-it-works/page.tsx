import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";
import { APP_STORE_URL } from "../lib/app-store";

export const metadata = {
  title: "How No Noise Scores works | No Noise Scores",
  description:
    "Follow, Alert, Track, No-Spoilers. The four ideas that make up the app.",
  alternates: { canonical: "https://nonoisescores.app/how-it-works" },
};

// The four ideas, described the way the app actually works today:
// • Tabs: Today, Schedule, Following, Watching (frame/TabBar.tsx). Settings
//   is the link at the foot of Following on phones and the bottom of the
//   sidebar on desktop (frame/DesktopSidebarNav.tsx).
// • "Pin" is dead (2026-07-03). The game-page control reads "Add to
//   Watching" on the web and "Track on Lock Screen" in the iPhone app for
//   a live game (game/TrackControl.tsx).
// • Tier lines follow PRESETS in state/types.ts.
// • No-Spoilers hides with placeholder dots and reveals one game at a
//   time, for the session (spoiler/reveal.tsx).

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function HowItWorksPage() {
  return (
    <ContentPageShell
      eyebrow="How it works"
      headline="Four ideas."
      intro="No Noise Scores is built around four ideas. They cover what the app does and what it doesn't."
    >
      <H2>1. Follow</H2>
      <P>
        A Follow is you telling the app what you care about. Teams.
        Countries. A specific playoff series. A tournament or a whole
        season.
      </P>
      <P>
        Following something means it surfaces on Today. Your team&apos;s
        games show up there on game day. Everything else stays quiet.
        Follows are unlimited and free.
      </P>

      <H2>2. Alert</H2>
      <P>
        Following is passive. Alerting is active. Turn alerts on for a
        follow and your phone buzzes when something happens. Three
        levels:
      </P>
      <BulletList
        items={[
          "Quiet. Start, final, and the rare big moment.",
          "Companion. The start, the breaks, the scores that matter for your team, and the final.",
          "Full Details. Every moment, every game.",
        ]}
      />
      <P>
        Each follow owns its own level. Companion for the team you
        watch. Quiet for the rest. You can change them anytime. Alerts are
        free on your first three follows.
      </P>

      <H2>3. Track</H2>
      <P>
        Tracking is for a single game. Following is for a team or
        country across a whole season. Track tonight&apos;s game when you
        want it in view while it&apos;s on.
      </P>
      <P>
        On a game page, tap{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Watching</strong>{" "}
        and the game lives on the Watching tab. In the iPhone app, a live
        game&apos;s button reads{" "}
        <strong style={{ color: "var(--ink)" }}>Track on Lock Screen</strong>
        . It adds the game to Watching and puts the live score on your Lock
        Screen. Tracking doesn&apos;t turn on alerts. That&apos;s a separate
        switch on the follow.
      </P>

      <H3>Quick rule</H3>
      <BulletList
        items={[
          "Follow = personalize the app.",
          "Alert = notification-enabled follow.",
          "Track = keep one game in view, in Watching or on your Lock Screen.",
        ]}
      />

      <H2>4. No-Spoilers</H2>
      <P>
        Turn No-Spoilers on once in Settings. Scores, headlines, and
        results stay hidden on every screen. Push notification previews
        stay vague. Tap a hidden score to reveal that one game.
      </P>
      <P>
        Good for watching games on delay. The hide contract holds
        across the app. Share images, page titles, push previews. If
        you see a leak, that&apos;s a bug.
      </P>

      <H2>The four tabs</H2>
      <BulletList
        items={[
          "Today. What's on now for the things you follow.",
          "Schedule. Every game, by week for the NFL and by day for a tournament.",
          "Following. Your follows and their alert levels.",
          "Watching. The games you're tracking.",
        ]}
      />
      <P>
        On your phone, the tabs sit along the bottom and Settings is at the
        bottom of Following. On a computer, they&apos;re in the sidebar,
        with Settings at the bottom.
      </P>

      <CalloutBox eyebrow="That's it">
        Four tabs. Four ideas. No feed, no news section, no fifth
        concept hiding somewhere.
      </CalloutBox>

      <P>
        <a href="/app" style={linkStyle}>
          Open the app in your browser
        </a>
        , or{" "}
        <a href={APP_STORE_URL} target="_blank" rel="noopener" style={linkStyle}>
          get it on the App Store
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
