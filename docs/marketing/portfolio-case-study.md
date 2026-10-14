# No Noise Scores: a calm sports companion

*Case study. Markdown, so it moves cleanly to a personal site, Notion,
Substack, dev.to or LinkedIn. Screenshot slots are marked. Real images
are in `store-assets/v1.0.4/69/`.*

---

## A calm sports companion for the moments that matter

No Noise Scores follows only the teams you choose, sends alerts at the
volume you set per team, and hides scores until you're ready to watch.
I designed and built it alone, from first sketch to the App Store, with
AI coding tools doing most of the typing. It covers the NBA Playoffs,
this summer's soccer tournament and the NFL season.

## The problem

Sports apps are feeds. They are built to be opened often, so they always
have something to show: league headlines, odds, highlights from teams
you've never followed, and notifications tuned for engagement. For a
fan who follows one or two teams, almost all of it is noise.

The cost is worse for anyone who watches on delay. Record a late game
and the score arrives anyway, from the app, the news and the group chat.
The common fix is to turn notifications off entirely, which throws away
the few that were useful: kickoff, the final, the moment your team took
the lead.

The gap isn't a missing feature. Most apps can technically do quiet
alerts and hidden scores. They're buried six screens deep, and the
default is loud. I wanted a product where calm is the default and every
setting is one tap from where you notice you need it.

## The audience

Adults who follow a few teams closely and watch a lot of games on
delay. People who left the big sports apps because they buzzed too
much. Fans who care how a product looks and feels.

It isn't for fantasy players, bettors or breaking-news readers, and the
product says so by leaving their features out. Saying no to that
audience made the product easier to explain to everyone else.

## The wedge

Narrow beats broad when the promise is calm. The app only knows your
follows, so it can make specific promises about them:

- **Follow.** Teams, countries, series or whole tournaments. Nothing
  else appears.
- **Volume per follow.** Quiet sends the start, the final and the rare
  big moment, usually two pushes a game. Companion adds the key beats
  and your team's scores. Full Details sends everything.
- **No-Spoilers.** Every score stays hidden until you tap a game.
- **Watching.** Keep the games you care about right now side by side,
  and on iPhone, on your lock screen.

The hide-by-default contract is the core: a hidden game's score is
never in the page at all. Not blurred, absent. A screen reader hears
"score hidden." A push says "A touchdown was scored." The lock screen
tile is sent no digits until you reveal it.

[Screenshot 1: `03-nospoilers.png`. Caption: A week of finals, every score hidden until you tap.]

## Brand and visual system

The current system is called Courtside. It has two rooms. Browsing
happens in porcelain, a quiet light ground with ink text. The room goes
dark, into what I call the arena, only where a game is live, so dark
means "live," never "decoration." Dark mode everywhere is a choice in
Settings and never flips on its own.

Type is Archivo, using its width axis as the identity: wide, heavy
numerals for scores and narrower labels for structure. Hanken Grotesk
carries the reading text. Every color is a token, and the iPhone widgets
and lock screen tile use the same tokens, held in step by a test that
fails if the Swift palette drifts from the web's.

Color is identity and state, not decoration. Sport color mostly lives
in progress fills, and the one live red marks only what is happening
right now.
Reading text follows the phone's Text Size setting up to 200 percent,
and a test fails the build if new text is sized in a way that would
ignore it.

[Screenshot 2: `01-today.png`. Caption: Today, with one live game in the arena room.]

## Technical stack

- **Web.** Next.js with the App Router, React and TypeScript, deployed
  on Vercel. One codebase serves the app and the marketing site.
- **iPhone.** Capacitor wraps the production web app. Native Swift adds
  a Live Activity (lock screen and Dynamic Island), home-screen and
  lock-screen widgets, and haptics.
- **Data.** ESPN's public scoreboard and play-by-play, normalized per
  sport. Vercel KV holds caches, push registrations and per-game state.
- **Alerts.** One dispatcher turns game events into pushes for Web Push
  (VAPID) and APNs, filtered per follow and per alert level. A scheduler
  drives a scan every minute during games.
- **Email.** The morning Brief goes out through Resend.
- **Quality.** A replay lab rebuilds real games from their play-by-play
  and runs them through the alert code. A scheduled cloud job runs it
  every Tuesday and emails a report. More than a thousand unit tests run
  on every push, and a release needs zero lint warnings.

[Screenshot 3: `02-lockscreen.png`. Caption: A live score on the lock screen. The numbers roll when it changes.]

## Design decisions worth highlighting

**A deliberate reveal.** Testing during a live Sunday showed the hidden
score on Today was itself the reveal button. The most natural tap, meant
to open the game, spoiled it. Now the card opens the game, and a
separate "Show score" control reveals in place.

**Promises you can check.** Every Tuesday a scheduled job replays the
weekend's real play-by-play through the production alert code. It
reports how many pushes each kind of fan got, when, and whether any
No-Spoilers push carried a digit or a name. It found a halftime push
landing fifteen minutes late, opening scores being swallowed, and
missed field goals going out as "big plays." Each fix shipped with a
test built on the game where it broke.

**Copy that matches the code.** Quiet once said "start and final only"
while the engine let a rare big moment through. The words changed to
match what the product does.

**Motion that means something.** Motion is budgeted: the room fades
dark when a game goes live, a revealed score develops into view, and on
the lock screen the numbers roll when the score changes. Nothing else
moves, and the app respects Reduce Motion.

[Screenshot 4: `06-following.png`. Caption: Three teams, three volumes.]
[Screenshot 5: `04-watching.png`. Caption: The games you're watching, side by side.]
[Screenshot 6: `05-detail.png`. Caption: Scoring plays and who mattered, when you want them.]

## Lessons learned

**Narrow is a feature you have to defend.** Every week brought a
reasonable request that would have made the app louder. The useful
question was never "is this good?" It was "does this keep the promise
of the volume the user chose?"

**Test the promise, not just the code.** Unit tests said the alert code
worked. Replaying real games through it showed that "working" alerts
could still arrive fifteen minutes late or say the wrong thing.

**Voice is a system.** Banning exclamation points, hype words and em
dashes sounds cosmetic. It made every screen sound like the same calm
person. One pass removed seventeen em dashes from the app, and the copy
read less like an ad afterward.

## What's next

The NFL season runs through February. The NBA Playoffs return in
April. A paid tier will add unlimited alerts and No-Spoilers for just
the teams you choose, to cover the cost of sending alerts. The free
version stays as calm as it is.

*No Noise Scores is on the App Store and at nonoisescores.app.*
