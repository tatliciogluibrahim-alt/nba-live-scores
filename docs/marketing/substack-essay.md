# Why I built a sports app without a feed

*For Substack, Medium or dev.to. About 1,250 words. Swap in your own
opening if the Sunday below isn't yours.*

---

The game I wanted to watch kicked off at 4:25. I was out until seven,
so I recorded it, and by 4:40 my phone had told me the score three
times. Once from a sports app, once from a news alert, once from a
group chat I couldn't mute fast enough. I watched the game anyway. It
was a different game by then.

That's the whole reason No Noise Scores exists.

## The problem

Sports apps are built like feeds. Open one and you get the league's
headlines, odds for games you don't care about, a highlight from a team
you've never followed, and a badge telling you something happened. They
are designed to be opened often, so they always have something to say.

Most people I know want the opposite. They follow one or two teams. They
want to know when the game is on, how it's going if they can't watch,
and how it ended. If they're recording it, they want to know nothing at
all until they press play. The apps can do all of this in theory. In
practice it takes six settings screens, and the notifications still
come.

So people turn notifications off entirely and lose the useful ones too.
I did.

## What I built, and what I left out

No Noise Scores is a calm sports companion for the moments that matter.
You follow your teams, and the app only ever talks about them.

Each follow gets its own volume. Quiet sends the start, the final, and
the rare big moment, like your team's game going to overtime. In
practice that's about two pushes a game. Companion adds the key beats:
the end of each quarter, halftime, and your team's touchdowns, but not
the other team's. Full Details sends everything. You can follow one team
on Quiet and another on Full Details, because you care about them
differently.

No-Spoilers hides every score until you tap a game. That includes the
score on the game page, the recap card, the text of every push
notification, and the live score on the iPhone lock screen. With
No-Spoilers on, a touchdown push reads "A touchdown was scored." It
doesn't say who, or the score. When you sit down to watch, you reveal
that one game.

On iPhone, a game you're watching can sit on your lock screen. The
score is there when you glance down, and when it changes the numbers
roll to the new value. Motion in the app is there to tell you something
changed: that roll, a revealed score developing into view, the room
going dark when a game goes live. Nothing else moves. If you'd rather not see the score, the lock screen shows two
quiet placeholders and "Tap to reveal" until you do.

There's also a morning email, the Brief. It covers what your teams did
yesterday and what's on today, in about the time it takes to read this
paragraph. It's opt-in, and it leaves the scores out if you ask it to.

What I left out matters as much. There is no feed. No news, no betting
odds, no fantasy, no ads, no account to make. There's no streak and no
badge. The app has four tabs, and one of them is just the games you're
watching right now.

It's on the App Store and on the web, and it follows the big moments
rather than every season: the NBA Playoffs and this summer's soccer
tournament, and now the NFL season.

## Two decisions that shaped everything

**Hide by default, at the data level.** The first version of
No-Spoilers blurred scores, which works until it doesn't. A blur can be
read in a screenshot. The number is still in the page for a screen
reader to say out loud. The winner's name is still in bold. So the rule
became: a hidden game never has its score in the page at all. The app
shows placeholder dots, and the screen reader hears "score hidden."
Even the lock screen tile only gets the score after you tap reveal. Until
then, the server sends it nothing to hide.

That rule held up. Six test runs during a live Sunday found no score in
any hidden page. They did find a trap I hadn't designed for. On Today,
the hidden score was itself the reveal button, so the most natural tap,
the one meant to open the game, spoiled it. Now the whole card opens the game, and revealing is
its own deliberate "Show score."

**Calm is a design system, not a color.** The app is light by default
and goes dark only where a game is live, in what I call the arena. You
can choose dark everywhere, but it never flips on its own. Text sizes
follow your phone's Text Size setting. Copy has rules: no exclamation
points, no "don't miss out," no em dashes. I once removed seventeen em
dashes from the app in one pass, because they made every sentence sound
like an ad.

## What I learned about narrowness

The hardest part wasn't building features. It was keeping promises.

Quiet says "the start, the final, and the rare big moment." For a while
the screen said "start and final only," but the code let a big moment
through. A tester caught the contradiction. I changed the words to match
what the app actually does, because a calm app that lies about its
volume isn't calm.

So I built a way to check. Every Tuesday, a scheduled job replays the
weekend's real play-by-play, every game and every play, through the
same code that sends alerts. Then it checks each level against its
promise. It counts how many pushes a fan of each team would have gotten
and when. It checks that no No-Spoilers push carried a digit or a
player's name.

It found real things. The halftime push was landing fifteen minutes
late, at the start of the third quarter, because the feed holds the
clock at zero for the whole break. The first score of a game was
sometimes swallowed, because the app's first look at a game treated
whatever had already happened as old news. This
week it found missed field goals going out as "big plays," because the
feed stores the kick distance where it stores yards gained. Each fix
came with a test built on the real game where it broke.

Narrow is easier to promise and easier to check. If the app did
everything, I couldn't tell you what it sends you. Because it does
little, I can tell you to the push.

## Where it's going

The NFL season runs through February, and the app lives on your lock
screen on Sundays. The NBA Playoffs come back in April, and they'll get
the same treatment.

It's free. Alerts are free on your first three follows, and No-Spoilers
for everything is free for good. Later, a paid tier will cover the cost
of sending alerts: unlimited alerts, and No-Spoilers for just the teams
you choose. That tier helps pay for the servers that send the pushes.
It isn't a reason to make the free version louder.

If you've turned sports notifications off because they were too much,
try following one team on Quiet for a week.

Follow what matters. Skip the rest.

*No Noise Scores is on the App Store and at nonoisescores.app.*
