# No Noise Scores Product Changelog

---

## 2026-05-11 — Phase 3 UX/Design Polish

### Files Changed

- `app/nba-app.tsx`
- `app/world-cup-app.tsx`
- `app/landing-page.tsx`

### UX / Design Changes

**nba-app.tsx**

- `SectionHeader`: upgraded from plain grey `<p>` + `<hr>` to editorial inline layout — display font, `tracking-[0.12em]`, horizontal rule as flex `<div>` (matches the No Noise editorial language)
- `PlayoffBand` share button: increased visibility from `bg-white/20 text-white/70` → `bg-white/30 text-white/90 hover:bg-white/50` — easier to tap on dark band
- `BracketView` header: removed verbose description sentence "Series cards update from live playoff matchups…" — header is now tight: eyebrow + h2 + pill badges only
- `ShareCardCanvas` logo lockup: slightly tighter icon (42→38px), smaller "No Noise" eyebrow (12→9px), wider letter-spacing (`0.08em`→`0.14em`), context line fontWeight bump to 900 — cleaner on social output

**world-cup-app.tsx**

- Mobile tab overflow fix: "Table & Schedule unlock June 11" now shows "🔒 Unlocks June 11" on small screens (`sm:hidden`) and full text on `sm:+` (`hidden sm:inline`) — eliminates text cut-off on iPhone SE / 375px

**landing-page.tsx**

- Coming-soon card opacity: `0.52` → `0.55` — slightly more readable while still clearly disabled

### Feature Changes

None — no features added or removed.

### Data / Logic Changes

None.

### Known Risks

- `SectionHeader` uses `var(--font-display)` — verify font loads on first paint (should be fine, same as existing headers)
- Share card canvas uses inline styles only — the logo/header sizing change is safe but test PNG capture at 2× pixel ratio on real device
- Mobile tab label `sm:hidden` / `hidden sm:inline` relies on Tailwind responsive prefix — works with Tailwind v4 but verify no purge issue

### Manual QA Checklist

- [ ] NBA Scores tab: section headers (LIVE · UPCOMING · FINAL) render with display font and inline divider
- [ ] NBA Bracket tab: header shows eyebrow + "Playoff Bracket" + pills — no description sentence
- [ ] PlayoffBand share button on dark card: tap target clearly visible
- [ ] Share card PNG: logo lockup is tight, "No Noise" eyebrow is readable, context line is bold
- [ ] World Cup pre-tournament on 375px: tab row shows "🔒 Unlocks June 11" (not cut off)
- [ ] World Cup pre-tournament on 640px+: tab row shows "Table & Schedule unlock June 11"
- [ ] No-country empty state still shows full CTA card with green button
- [ ] Coming-soon cards on homepage: slightly more visible at 0.55 opacity

---

## Current Direction

No Noise Scores is a calm, mobile-first live hub for major sports moments.

We are focusing on sports moments, not regular seasons.

Current active experiences:

- NBA Playoffs
- FIFA World Cup 2026

## Domain

Production domain:

https://nonoisescores.app

## Key Product Decisions

### Major Sports Moments

We chose Option B:

No Noise Scores should be a hub for major sports moments instead of a generic all-season scoreboard.

Examples:

- NBA Playoffs
- FIFA World Cup 2026
- March Madness
- NFL Playoffs
- Champions League
- Olympics

### NBA

NBA should be framed around playoffs.

Current useful features:

- live scores
- next/upcoming games
- final scores
- playoff series context
- favorite team dropdown
- My Team filter
- share cards

### World Cup

World Cup should feel like a calm tournament companion.

Important ideas:

- pick your country
- team/country colors follow you
- countdown to kickoff
- group context
- reminder prompt
- table and schedule unlock later

### Filters

Floating/sticky filter dock was tested and rejected for now.

Current preference:

- normal control dock under hero/header
- clean spacing
- no heavy overlay

### Favorite Team / Country

Large inline Follow buttons were tested but felt too noisy.

Preferred approach:

- favorite team dropdown
- country picker
- My Team / selected country filter
- subtle badges only

### Share Cards

Share cards are a major growth loop.

They should include:

- No Noise logo
- team logos or country flag
- scores/status/countdown
- nonoisescores.app
- @nonoisescores

### Instagram

Instagram should not be a big button in the app yet.

Preferred placement for now:

- share card footer only:
  `nonoisescores.app · @nonoisescores`

### Email Signup

Email signup is a good future idea but not current Phase 3.

Possible product:

The Quiet Recap

Concept:

- final scores without the feed
- weekly or nightly recap
- personalized by team/country later

Do not add yet unless explicitly requested.

## Current Phase

Phase 3: World Cup page hierarchy and mobile UX.

Current Phase 3 priorities:

1. Fix World Cup mobile no-country empty state
2. Make Pick Country the central CTA when no country is selected
3. Fix “Table & Schedule unlock June 11” mobile cutoff
4. Improve share card branding
5. Keep Instagram subtle in share card footer
6. Preserve NBA experience

## Recent Notes

- Bought `nonoisescores.app`
- Sports picker homepage now makes product feel like a platform
- World Cup page is a strong wedge because:
  - casual fans
  - national identity
  - tournament complexity
  - reminders
  - shareable countdowns
- NBA page is strong as an event scoreboard for playoffs
- Product should not become cluttered or generic

## Future Roadmap

### Phase 4: Country Picker Polish

- Search
- Groups
- Better selected states
- Persist selected country
- Better mobile touch targets

### Phase 5: Country Color Theming

- Theme map
- Primary and secondary colors
- Safe contrast
- Use color as accent

### Phase 6: Reminder Soft Launch

- Save reminder intent locally
- No backend yet
- Future-ready for email/browser/iOS alerts

### Phase 7: Share Cards

- Reusable share card system
- NBA score cards
- World Cup countdown cards
- Country cards
- App-branded social output

### Phase 8: NBA Playoffs Cleanup

- Make playoff framing clearer
- Preserve live scores and series context
- Avoid regular-season expansion

### Phase 9: Empty States

- No live games
- No games for selected team
- No selected country
- Locked schedule/table
- No results in filter

### Phase 10: Code Cleanup

Potential files:

components/
- BrandLockup.tsx
- EventCard.tsx
- FilterDock.tsx
- FilterPill.tsx
- GameCard.tsx
- TeamLogo.tsx
- TeamLine.tsx
- PlayoffBand.tsx
- SectionHeader.tsx
- EmptyState.tsx
- ShareCardModal.tsx

lib/
- game-types.ts
- game-formatters.ts
- game-sections.ts
- site-config.ts
- world-cup-data.ts
- country-themes.ts

hooks/
- useLiveScores.ts
- useLocalStorage.ts
- useFavoriteTeam.ts
- useSelectedCountry.ts

### Phase 11: Domain/PWA Polish

- metadata
- manifest
- theme color
- app icon
- social preview

### Phase 12: Monetization Foundation

- feature flags
- sponsor config
- no paywall yet