import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
  CalloutBox,
} from "../companion/landing/ContentPageShell";
import {
  NFL_2026_SEASON_OPENER,
  NFL_2026_SEASON_END,
} from "../companion/following/data/nfl-dates";
import { APP_STORE_URL } from "../lib/app-store";

export const metadata = {
  title: "NFL scores and alerts for your team | No Noise Scores",
  description:
    "Follow your NFL team calmly. Kickoff and final alerts by default, touchdowns if you want them, Lock Screen scores on iPhone, and No-Spoilers for the game you recorded.",
  alternates: { canonical: "https://nonoisescores.app/nfl" },
};

// /nfl — the NFL season's front door on the marketing layer.
//
// Every claim here is read off the code, not written from memory:
// • Tier contents: docs/nfl-design.md tier mapping, the significance
//   engine (OT breaks through to an own-team Quiet follow), and the
//   2026-09-20 Week 2 audit (Companion TDs are own-team only, turnovers
//   are Full Details only).
// • "Usually two pushes a game" on Quiet: the replay lab's measured
//   median for a team follow (Weeks 1-3, docs/nfl-design.md).
// • New NFL follows start on Quiet: defaultAlertTierForMoment in
//   state/moments.ts. Alerts on for the first three follows:
//   MAX_FREE_ALERT_SLOTS in providers.tsx addFollow / addMomentFollow.
// • No-Spoilers push copy is quoted verbatim from the dispatcher's NFL
//   templates (narration never runs on a No-Spoilers payload).
// • Lock Screen: TrackControl labels, MAX_LOCK_SCREEN_SLOTS = 3, the
//   "Lock screen live scores" toggle in Settings.
// • Season dates come from nfl-dates.ts, the one source of truth.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function NFLPage() {
  return (
    <ContentPageShell
      eyebrow="NFL Season"
      headline="NFL Sundays, for the team you follow."
      intro="Follow your team through the 2026 season. Kickoff and final alerts by default, touchdowns if you want them, and No-Spoilers for the game you're recording."
    >
      <P>
        Alerts run from the season opener on{" "}
        {NFL_2026_SEASON_OPENER.label} through the Super Bowl on{" "}
        {NFL_2026_SEASON_END.label}. Preseason games never send them.
      </P>

      <H2>The 1 PM slate</H2>
      <P>
        At 1 PM ET on a Sunday, a full slate of games kicks off at once.
        Today shows only the ones you follow: your team&apos;s live score
        first, then what&apos;s next for you. The rest of the slate stays
        off the screen.
      </P>
      <P>
        When you want the whole picture, Schedule has every game of the
        week with kickoff times and channels. Tap any game for its scoring
        plays, newest first, the score by quarter, and who mattered on each
        side.
      </P>

      <H2>Pick how loud</H2>
      <P>
        Every follow has its own alert level. New NFL follows start on
        Quiet. Alerts are free on your first three follows.
      </P>
      <H3>Quiet</H3>
      <P>
        Kickoff and the final. Overtime breaks through when your
        team&apos;s game gets there. Usually two pushes a game.
      </P>
      <H3>Companion</H3>
      <P>
        Kickoff, the end of the first quarter, halftime, the end of the
        third, overtime, and the final. Plus your team&apos;s touchdowns,
        and only your team&apos;s.
      </P>
      <H3>Full Details</H3>
      <P>
        Every moment, every game. Touchdowns and field goals by either
        team, safeties, two-point tries, turnovers, and plays of 40 yards
        or more.
      </P>
      <P>
        Each game keeps at most two cards in Notification Center, one for
        the game and one for its latest play, so a busy afternoon
        doesn&apos;t pile up.
      </P>

      <H2>Recording the 4:25 game</H2>
      <P>
        You&apos;re out for the afternoon and recording your team&apos;s
        late game. Turn on No-Spoilers before kickoff. It&apos;s at the top
        of Settings. On your phone, Settings is at the bottom of the
        Following tab. On a computer, it&apos;s in the sidebar.
      </P>
      <BulletList
        items={[
          "Scores turn into placeholder dots on Today, Schedule, Watching, and the game page.",
          "The game page folds its scoring plays into one hidden row and leaves out the top performers.",
          "In the iPhone app, a game on your Lock Screen keeps its score hidden too.",
          "Pushes keep their timing and drop the details. A touchdown push reads \"A touchdown was scored.\" No score, no player. The final reads \"Game wrapped. Tap when you're ready.\"",
        ]}
      />
      <P>
        When you sit down to watch, tap the hidden score to reveal that one
        game. Everything else stays hidden.
      </P>
      <CalloutBox eyebrow="One honest note">
        On Companion, a touchdown push only comes when your team scores, so
        the buzz itself is a hint. Quiet sends less: kickoff, the final, and
        overtime if it happens. For no hints at all, turn that follow&apos;s
        alerts off until you&apos;ve watched.
      </CalloutBox>

      <H2>Your team on the Lock Screen</H2>
      <P>
        In the iPhone app, open a live game and tap{" "}
        <strong style={{ color: "var(--ink)" }}>Track on Lock Screen</strong>.
        The score and the clock sit on your Lock Screen and in the Dynamic
        Island, and update as the game goes. You can track up to three
        games at once.
      </P>
      <P>
        The kickoff push for your team can do it for you. Tap it and the
        live score goes to your Lock Screen. You can turn that off in
        Settings, under Lock screen live scores.
      </P>
      <P>
        A tracked game leaves the Lock Screen at the final. On the web, the
        same button reads{" "}
        <strong style={{ color: "var(--ink)" }}>Add to Watching</strong>{" "}
        and keeps the game on the Watching tab.
      </P>

      <H2>Set it up</H2>
      <BulletList
        items={[
          "Get the iPhone app from the App Store, or open No Noise Scores in any browser.",
          "Open Following, tap Add follow, then choose the NFL and your team.",
          "Tap the follow to change its level. It starts on Quiet.",
          "Turn on notifications when the app asks.",
        ]}
      />
      <P>
        Want a recap by email too? The morning Brief carries your
        team&apos;s kickoff on game day and the final the morning after.
      </P>
      <P>
        <a href={APP_STORE_URL} target="_blank" rel="noopener" style={linkStyle}>
          Get it on the App Store
        </a>
        , or{" "}
        <a href="/app" style={linkStyle}>
          open it in your browser
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
