# App Store Connect Content — No Noise Scores v1.0

Drafted 2026-05-29. Aligned with the AGENTS.md locked positioning, the
brand voice rules, and the actually-shipped feature set (no paid tier
mentioned because checkout isn't live yet).

---

## Voice principles for store copy

Borrowed from AGENTS.md and tightened for the App Store medium:

1. **Declarative, not promotional.** "It does X" beats "Discover the
   power of X." No "Don't miss out." No "Trending now." No "Top stories."
2. **Each thought is a sentence.** No em-dashes joining clauses. Periods
   carry the rhythm.
3. **Concrete features over abstract benefits.** "Pin a game to follow
   it closely" beats "Unlock seamless game-day experiences."
4. **Negative space is a feature.** Naming what the app *doesn't* do
   ("No feeds. No ads. No betting.") is on-brand and signals to App
   Review what category we're in.
5. **No first-person plural marketing voice.** Avoid "we built", "we
   believe", "we know fans want…" The product speaks for itself.
6. **Specificity over generality.** "NBA Playoffs and FIFA World Cup
   2026" beats "all major sports". Real moments, real dates.

Don't drift the locked positioning lines:
- One-line: *A calm sports companion for the moments that matter.*
- Tagline: *Follow what matters. Skip the rest.*
- Long subhead: *Scores, alerts, and recaps for what you follow.*

---

## App Name (30 chars max)

```
No Noise Scores
```
**15 chars.** Locked in.

---

## Subtitle (30 chars max)

```
Scores and recaps. No noise.
```
**28 chars.** Functional ("scores and recaps") plus brand ("no noise" —
echoes the app name and signals the no-feeds promise). Both halves
matter for keyword indexing: Apple weighs subtitle words highly.

Alternative if you prefer pure brand: `Follow what matters.` (20 chars,
echoes the tagline). Less functional, more poetic.

---

## Keywords (100 chars max, comma-separated)

```
world cup 2026,nba playoffs,no spoilers,soccer,bracket,widget,live activity,fifa,recap
```
**89 chars.** Strategy:

- **High-volume, obvious:** `nba playoffs`, `world cup 2026`, `soccer`,
  `fifa` — people will search these by the millions in 2026. We won't
  outrank ESPN on these alone, but the long tail (`nba playoffs +
  bracket`, `world cup 2026 + widget`) is where we can win.
- **Mid-volume, less crowded:** `bracket`, `widget`, `recap` — feature
  searches that overlap user intent ("I want a sports widget").
- **Niche, high-intent:** `no spoilers`, `live activity` — fewer people
  search these, but the ones who do are exactly our user. `no spoilers`
  is genuinely unique to us in the sports category.

Words already in the name/subtitle (`scores`, `noise`) are *not*
repeated — Apple indexes those fields separately and double-stuffing
wastes the keyword field. Plurals (`brackets`, `widgets`) are skipped
because Apple stems automatically.

Update for v1.1 / mid-tournament: swap `bracket` for `fixtures` once
World Cup is live (EU users search "world cup fixtures"). Swap `nba
playoffs` for `nba finals` if releasing during Finals week.

---

## Promotional Text (170 chars max)

```
Calm by design. Follow your teams through the NBA Playoffs and FIFA World Cup 2026. Get alerts for the moments. Skip the noise.
```
**130 chars.** Editable in Connect without a resubmission, so this is
the place to update with the current moment ("World Cup kicks off
June 11" / "Conference Finals are here" / etc.).

---

## Description (~4000 chars max; ours is ~1700)

```
A calm sports companion for the moments that matter.

Follow what matters. Skip the rest.

No Noise Scores is built for two moments: the NBA Playoffs and the FIFA World Cup 2026. You pick what you follow. Teams, countries, series, or whole tournaments. Only those games show up here. Everything else stays quiet.

WHAT YOU GET

· Calm scores. Live for the games you follow, recaps when you wake up.
· Alerts you control. Three levels per follow: Quiet, Companion, or Full Details. You set how loud each one gets.
· No-Spoilers mode. Hide everything until you're ready. Tap to reveal one game at a time.
· The Brief. A short morning email of the games coming up today.
· Watching tab. Pin a game to follow it closely. Live Activities keep it on your lock screen.
· Home screen widget. The next followed games at a glance.

WHAT IT DOESN'T HAVE

No feeds. No ads. No fantasy. No betting modules. No "Trending now." No "Top stories." No noise.

BUILT FOR THE MOMENTS THAT MATTER

NBA Playoffs through the Finals. FIFA World Cup 2026 across all 12 groups and the knockout rounds. NFL support arrives for the 2026 season opener.

Built independently. Calm by design.

Questions or feedback: nonoisescores@gmail.com
```

Notes on choices:
- Opens with the **locked one-line and tagline back-to-back**. Anyone
  who sees both lines in the App Store gets the positioning in two
  seconds.
- **Three named features** (Brief, Watching, Widget) so it doesn't
  read as vapor.
- "WHAT IT DOESN'T HAVE" lists the negative space explicitly. App
  Review can read this and immediately know we're not a betting /
  fantasy / news app.
- **No mention of No-Spoilers Pro** or any paid tier. There's no
  checkout shipped; mentioning pricing could be flagged as misleading.
  Update this section in a later release when Pro ships.
- Contact email at the bottom — App Review wants reachability and
  this doubles as the support address.
- No em-dashes anywhere. Each clause is its own sentence.

---

## What's New (v1.0)

```
The first release.

A calm companion for the NBA Playoffs and the FIFA World Cup 2026. Follow what matters. Skip the rest.

Built independently. No feeds. No ads. No noise.
```

Three short paragraphs. No hype. No "we are excited to announce."

---

## Privacy Nutrition Label

App Store Connect makes you declare every data category. Here's what
to enter, mapped to what the app actually collects.

### Step 1: "Do you collect any data?"
**Yes.**

### Step 2: Data categories to declare

**Contact Info → Email Address**
- Collected: yes (only when the user signs up for the Brief)
- Linked to user identity: **yes** (the email IS the identity)
- Used for tracking: **no**
- Purposes: **App Functionality** (delivering the Brief)

**Identifiers → Device ID**
- Collected: yes (APNs push token, per device)
- Linked to user identity: **no** (it's the device token, not tied to
  an account)
- Used for tracking: **no**
- Purposes: **App Functionality** (routing push notifications)

**Usage Data → Product Interaction** (only if Vercel Analytics is on
in production)
- Collected: yes
- Linked to user identity: **no**
- Used for tracking: **no**
- Purposes: **Analytics**

That's it. No location. No contacts. No photos. No browsing history.
No purchase history. No financial info. No health/fitness. No advertising.

### Privacy policy URL
```
https://nonoisescores.app/privacy
```

### Data retention summary (for the policy itself, if asked)
- Follows / pins / preferences: stored in browser localStorage on
  device; never leave the device.
- APNs push token: stored on the server, keyed by token. Removed when
  the device unregisters or APNs reports the token dead (410).
- Brief email: stored on the server. User can unsubscribe via the
  email or contact us to delete.

---

## Support URL

```
https://nonoisescores.app/privacy
```

The Privacy page already has the contact email. If you want a
dedicated `/support` page, it's a small lift later. For now, Privacy
covers App Review's "must be reachable" requirement.

---

## Marketing URL (optional)

```
https://nonoisescores.app
```

The desktop landing.

---

## Copyright

```
© 2026 No Noise Scores
```

Or include your legal name if you have a registered entity. App Store
accepts either.

---

## Category

- **Primary:** Sports
- **Secondary:** News (because of the Brief; alternative: Lifestyle)

---

## Age Rating

**4+.** No objectionable content. No gambling content (we explicitly
avoid betting modules). No unrestricted web access (we control what
loads).

---

## In-App Purchases

**None for v1.0.** When No-Spoilers Pro ships, you'll add it here
with its own metadata.

---

## Final checklist before submitting

- [ ] App icon set across all required sizes (1024x1024 base)
- [ ] Screenshots for required device sizes (6.9" iPhone, 6.5" iPhone, 13" iPad if iPad-supported)
- [ ] All copy in this doc pasted into the right Connect fields
- [ ] Privacy nutrition label answered per "Step 2" above
- [ ] Privacy policy URL points at `/privacy` (live page)
- [ ] Support URL works
- [ ] TestFlight build with `LIVE_ACTIVITY_SANDBOX = false` (production APNs)
- [ ] Dev tools removed (`LiveActivityTester`, `WCPreviewToggle`)
- [ ] Diagnostic console.logs removed (BUILD tags, dispatch logs)
- [ ] A clean run-through on a fresh install: onboarding → follow →
      pin → live activity → notification → unfollow
