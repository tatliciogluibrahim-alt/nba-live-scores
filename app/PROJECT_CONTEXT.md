# No Noise Scores: Project Context

## Product Summary

No Noise Scores is a calm, premium, mobile-first live hub for major sports moments.

The product is not trying to become another ESPN, Bleacher Report, or betting-heavy sports app. It should strip away clutter and help fans quickly follow the games, teams, countries, and tournaments they care about.

Core positioning:

> Live scores for the moments that matter. No feeds. No clutter.

## Current Domain

Production domain:

https://nonoisescores.app

## Current Product Direction

We are focused on major sports moments, not regular seasons for now.

Current active moments:

1. NBA Playoffs
2. FIFA World Cup 2026

Future sports moments may include:

- March Madness
- NFL Playoffs
- Champions League
- Olympics
- Other high-interest tournaments or playoff moments

Do not build generic regular-season experiences unless explicitly asked.

## Brand

Brand name:

No Noise Scores

Brand traits:

- Calm
- Premium
- Mobile-first
- Fast
- Minimal
- Editorial
- Useful
- Sports-energy without sports-app clutter

Avoid:

- Feeds
- Hot takes
- Betting prompts
- Intrusive ads
- Loud banners
- Overly dense stats
- Generic SaaS styling
- Random redesigns

## Current Visual System

The current visual system uses:

- Cream/off-white backgrounds
- Dark espresso/navy text
- Orange No Noise accent
- Green accents for World Cup
- Bold condensed display typography
- Rounded cards
- Subtle borders and shadows
- Clean game cards
- Minimal sponsor/brand placements

Preserve this visual direction unless explicitly asked to redesign.

## Current App Structure

This is a Next.js app deployed on Vercel.

Core areas:

- Sports picker homepage
- NBA Playoffs experience
- FIFA World Cup 2026 experience
- Share card / save image modal
- Country picker
- Team picker/favorite team behavior

## NBA Playoffs Experience

The NBA section currently includes:

- Scores tab
- Bracket tab
- Live / Next / Final / My Team filters
- Favorite team dropdown
- Team logos from ESPN
- Game cards with:
  - game status
  - clock
  - matchup
  - team logos
  - scores
  - lead/won badges
  - series context
  - share button

Important NBA behavior:

- Team logos should remain visible on the web version.
- Favorite team selection should persist.
- The app should use a sports-day cutoff so late games after midnight still count as the previous NBA night until around 5 AM.
- Avoid ugly clock states like `Q2 · 0.0`; use `End Q2`, `End Q3`, etc.

## World Cup 2026 Experience

The World Cup page should feel like a calm tournament companion, not a generic soccer scoreboard.

It should help users:

- See countdown to kickoff
- Pick a country
- See their country’s group
- See group opponents
- Save reminder intent
- Later view table and schedule
- Share clean tournament cards

Current World Cup elements:

- Back to Sports
- World Cup header
- Pick country dropdown
- Groups / Table / Schedule tabs
- Countdown card
- Selected country module
- Reminder prompt
- Opening match details

Important World Cup behavior:

- If no country is selected, the page should not feel empty.
- The default state should strongly invite the user to pick a country.
- The selected country should theme the page subtly.
- “Table & Schedule unlock June 11” should not cut off on mobile.
- Locked tabs should be readable and clean.
- Country selection should persist locally.

## Share Cards

Share cards are a key growth loop.

They should be clean, premium, and social-ready.

Share cards should include:

- No Noise Scores logo/lockup
- Team logos or country flag when relevant
- Team abbreviations/country name
- Score or countdown
- Status line, such as:
  - `FINAL · PHI @ NY`
  - `LIVE · Q3 · PHI @ NY`
  - `36 DAYS UNTIL KICKOFF`
- Footer:
  - `nonoisescores.app · @nonoisescores`

Instagram should only appear subtly in share card footers for now.

Do not add large Instagram buttons in the main scoreboard UI yet.

## Monetization Direction

Avoid intrusive ads. Ads conflict with the “no noise” promise.

Preferred monetization paths:

### 1. Quiet Sponsorships

Text-based or native sponsorships, such as:

- Sponsored by Ibra-Heem
- Playoff coverage presented by [Brand]
- World Cup coverage presented by [Brand]

These should feel subtle and integrated.

### 2. One-Time Pro Unlock

Possible unlocks:

- Favorite team alerts
- Saved preferences
- Extra share card styles
- Spoiler-free mode
- More followed teams/games

### 3. Paid Sports/Event Packs

Potential examples:

- NBA Playoffs Pack
- World Cup Pack
- March Madness Pack
- All Sports Moments Pack

### 4. White-Label / B2B Scoreboard Pages

Potential customers:

- sports bars
- creators
- newsletters
- Discord communities
- fan communities
- local sports media
- podcasts

### 5. Quiet Data / Fan Intent

Potential future data product:

- Weekly Fan Intent Report
- Creator Newsletter Dashboard
- Aggregated team/country interest trends

Privacy positioning:

> Quiet data, not creepy data.

Collect only transparent user preferences, such as:

- email
- favorite team
- favorite country
- sports followed
- notification preferences

Do not sell personal data.

## Email Signup Future

Potential email product:

The Quiet Recap

Concept:

- final scores without the feed
- tournament reminders
- team/country-specific recaps

Possible copy:

> Get the final scores without the feed.
> A quiet recap when the games are done.

Do not add email capture until explicitly requested.

## iOS Future Goal

Long-term goal:

Turn No Noise Scores into an iOS app.

Potential path:

1. Web/PWA polish
2. App wrapper if needed
3. Native iOS features later

Future iOS features:

- favorite team alerts
- favorite country alerts
- game start alerts
- final score alerts
- Lock Screen Live Activities
- Dynamic Island support
- follow one game on the lock screen
- higher tier could support multiple games if technically feasible

Important:

Official team logos may need licensing for App Store use. Web version can keep current team logos for MVP, but future app-safe mode may need initials/generic badges.

## Development Style

The user is a beginner coder.

When making code changes:

- Provide full replacement files when possible.
- Avoid vague “find this and replace” instructions.
- Keep changes targeted.
- Do not redesign unless asked.
- Preserve working behavior.
- Preserve current visual system.
- Run or consider `npm run build`.
- Explain what changed briefly.

## Current Priority

Current phase:

Phase 3: World Cup mobile UX and tournament companion polish.

Focus on:

1. Better World Cup no-country state
2. Fix mobile tab/copy overflow
3. Improve selected-country hierarchy
4. Improve share card brand output
5. Keep Instagram only in share card footer for now
6. Do not add email signup yet
7. Do not add monetization UI yet
8. Do not refactor the whole app yet