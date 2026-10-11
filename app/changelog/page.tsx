import {
  ContentPageShell,
  H2,
  H3,
  P,
  BulletList,
} from "../companion/landing/ContentPageShell";

export const metadata = {
  title: "Changelog | No Noise Scores",
  description:
    "Public version of what we ship. Editorial summaries, not git log dumps.",
  alternates: { canonical: "https://nonoisescores.app/changelog" },
};

// Changelog — public-facing editorial summary of what we ship. Mirrors
// app/CHANGELOG_PRODUCT.md (the source of truth) but stripped of internal
// jargon and reframed for end users. Newest at top.
//
// Keep entries short, plain, and honest. Each month is one H3 with a
// title, a brief P, and a BulletList of changes. Every line traces to an
// entry in CHANGELOG_PRODUCT.md. No component, file, or design-system
// names here: describe what a user sees, not what it's called inside.

const linkStyle = {
  color: "var(--ink)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

export default function ChangelogPage() {
  return (
    <ContentPageShell
      eyebrow="Changelog"
      headline="What shipped."
      intro="Most recent on top."
    >
      <H2>2026</H2>

      <H3>October. Fixes from a Sunday of testing.</H3>
      <P>
        We tested the app through the Week 5 early games, as six different
        kinds of fan. These fixes came out of it, along with a few from
        earlier in the month.
      </P>
      <BulletList
        items={[
          "Coming back to Watching no longer flashes your live NFL games as missing.",
          "On the web, \"Turn on alerts\" during setup now asks for notification permission, the same way Today does.",
          "On a follow, the alerts control now reads \"Turn off\", which is what it does.",
          "Quiet reads the same everywhere: start, final, and the rare big moment.",
          "With No-Spoilers on, opening a game from Today no longer reveals its score. \"Show score\" reveals it in place.",
          "Settings stopped calling per-follow No-Spoilers \"coming later\". It already works.",
          "The morning Brief stopped listing NBA preseason games.",
          "A live Watching room now fills the phone screen instead of stopping short of the tab bar.",
        ]}
      />

      <H3>September. The NFL season, and alerts that land on time.</H3>
      <P>
        NFL alerts went live with the season opener on September 9. The
        rest of the month went into making them arrive at the right moment.
      </P>
      <BulletList
        items={[
          "Companion sends only your own team's touchdowns. Before, it sent both teams'.",
          "Turnovers moved to Full Details.",
          "A game's alerts replace each other in Notification Center instead of stacking up.",
          "Who mattered credits touchdowns from other categories, so a rushing leader who scored on a catch shows that touchdown.",
          "The first score of a game sends its alert again. In Weeks 1 to 3, the opening score of 30 of 47 games never pushed.",
          "Halftime alerts arrive at the half, not when the second half kicks off. During the break, scores read \"Halftime\" instead of \"Q2 0:00\".",
          "The kickoff alert on the web stopped repeating the matchup.",
          "Each week, the finished games are replayed through the alert system to check that every level sent what it promises.",
        ]}
      />

      <H3>August. A new look, and the NFL gets ready.</H3>
      <P>
        The app got a new design at the end of the month, and every NFL
        screen got ready for real games.
      </P>
      <BulletList
        items={[
          "A new look across the app: a lighter ground, new type, and live games set in a dark room of their own. The app never switches to dark mode on its own.",
          "Hidden scores became placeholder dots. The real numbers don't reach the page until you reveal them.",
          "NFL game pages: scoring plays newest first, who mattered on each side, and the score by quarter.",
          "Today shows your live NFL games.",
          "Preseason games are labeled as preseason, and they never send alerts.",
          "The Brief learned the NFL. Game day carries your kickoff, and the morning after carries the final.",
          "Before the opener, two bugs that would have stopped NFL alerts were found and fixed.",
        ]}
      />

      <H3>July. Schedule, smarter alerts, and the end of Summer Soccer.</H3>
      <P>
        Summer Soccer finished on July 19, and the NFL became followable
        the next day.
      </P>
      <BulletList
        items={[
          "Schedule became the fourth tab: every game by day, the bracket, and the groups. Today shows today, plus one pointer to what's next.",
          "\"Pin\" became \"Add to Watching\" on the web and \"Track on Lock Screen\" in the iPhone app.",
          "Smarter alerts. A real classic, like a comeback or a close finish, can reach even a Quiet follow, and low-stakes moments only reach Full Details.",
          "Today became strictly personal. Games you don't follow stay off it.",
          "No-Spoilers holds everywhere, including pushes, widgets, and the Lock Screen, even when it's set for a single follow.",
          "The bracket filled in winners as each round finished. A data limit that hid the last four matches from the schedule was fixed.",
          "Summer Soccer match pages showed the starting XI, with substitutions.",
          "The NFL became followable on July 20, with the full schedule by week.",
        ]}
      />

      <H3>June. Summer Soccer, the bracket, and the iPhone app.</H3>
      <P>
        The tournament arrived, the iPhone app reached the App Store, and
        the whole app got quieter and more considered along the way.
      </P>
      <BulletList
        items={[
          "The iPhone app went live on the App Store on June 17.",
          "Summer Soccer 2026 went live. Groups, official standings, every fixture, and a round-by-round bracket. Once the group stage wrapped, the tournament led with the bracket instead of the finished groups.",
          "A real desktop experience. Every live game you follow at a glance, the full bracket laid out as columns, keyboard shortcuts to move between tabs, and a redesigned home page.",
          "Tournament lifecycle. A tournament that's over reads \"Season wrapped\" and stops sending alerts. The results stay to browse, with nothing to clean up.",
          "Calmer motion throughout. Scores resolve into focus when you reveal them, the day settles in once instead of replaying on every visit, and cards fade out instead of popping.",
          "More accurate alerts. Goal notifications name the right scorer, and the \"live now\" count always matches what's on screen.",
          "Lock-screen Live Activities on iPhone. A game you're tracking lives on your lock screen, with the score and the clock.",
        ]}
      />

      <H3>May. Stakes, recaps, and the Brief.</H3>
      <P>
        Three features that turned the app from a calm scoreboard into a
        calm sports companion.
      </P>
      <BulletList
        items={[
          "Stakes lines on game and country pages, like \"X can close the series with one more win.\" or \"Game 7. Winner takes the series.\"",
          "A recap card after each final: the winner in the headline, the score, what mattered, and the next game when there is one.",
          "The Brief. A personalized morning email of what your follows did. It started sending daily on May 28.",
          "Tournament and team pages.",
          "Country pages link back to the full list of countries.",
        ]}
      />

      <H3>May. Getting ready for Summer Soccer.</H3>
      <P>The month before the June 11 kickoff.</P>
      <BulletList
        items={[
          "Country pages counted down to kickoff.",
          "Today showed a quiet note about the tournament 8 to 30 days out, and a countdown to the first whistle in the last 24 hours.",
          "Country pages showed your alert level at a glance.",
          "Kickoff and full-time alerts for the countries you followed.",
        ]}
      />

      <H3>April and May. The groundwork.</H3>
      <P>
        A pass across navigation, Today, game pages, country pages, alert
        controls, and small visual details.
      </P>
      <BulletList
        items={[
          "Tap a country or a series in Following to open its page.",
          "Game pages gathered the series into one block under the score.",
          "Compact alert controls, one row per follow.",
          "Finished games keep their page, so an old game never dead-ends.",
          "Slightly larger tap targets on Today.",
        ]}
      />

      <H2>Earlier</H2>
      <P>
        The first versions set the basics: a calm cream and paper look,
        three alert levels per follow (Quiet, Companion, Full Details),
        series dots for every playoff series, and a path to the final for
        each country.
      </P>

      <H2>What&apos;s coming</H2>
      <P>
        The next iPhone update is with Apple for review. It brings the new
        look to the Lock Screen, the Dynamic Island, and the widgets, and
        scores that roll to the new number when they change.
      </P>
      <P>
        Want to try things before they ship?{" "}
        <a href="/beta" style={linkStyle}>
          Join the testers
        </a>
        .
      </P>
    </ContentPageShell>
  );
}
