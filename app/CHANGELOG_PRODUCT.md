# No Noise Scores Product Changelog

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