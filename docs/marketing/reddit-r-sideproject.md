# r/SideProject

Replaces the r/soccer draft from the original runbook: this summer's
soccer tournament ended July 19. r/SideProject welcomes builders posting
their own work, so this one can say plainly what it is. Check the
current rules on titles and links before posting.

---

**Title**

I built a sports app with no feed: it only follows your teams, and it
hides scores until you're ready

**Body**

I'm a one-person builder. No Noise Scores is a calm sports companion for
the moments that matter, live now for the NFL season on iPhone and the
web.

What it does:
- Follow only your teams. Nothing else shows up.
- Pick a volume per team. Quiet is the start and the final (and the rare
  big moment), usually two pushes a game. Companion adds the key beats.
  Full Details sends everything.
- No-Spoilers hides scores everywhere, including push text and the
  iPhone lock screen, until you tap a game.
- A live score on your lock screen that rolls when it changes.

What it leaves out: feeds, news, odds, fantasy, ads and accounts.

The part I'm proudest of is boring. Every Tuesday a scheduled job
replays the weekend's real play-by-play through the alert code and
checks each level against its promise. It has caught a halftime push
landing 15 minutes late and missed field goals going out as "big plays."

Built with Next.js and a Capacitor wrapper for the iPhone app, with
Live Activities and widgets in Swift.

iPhone: https://apps.apple.com/app/id6774968763
Web: https://nonoisescores.app

Feedback welcome, especially on what feels like too much.

[Screenshots: `01-today.png` and `02-lockscreen.png` from
`store-assets/v1.0.4/69/`]
