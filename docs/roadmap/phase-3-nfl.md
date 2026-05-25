# Phase 3 — NFL (the second sport)

**Estimated time:** 2–3 weeks (after Phases 1 + 2 ship)
**Ship criteria:** Open Today during NFL Week 1. Your followed NFL team's game gets a kickoff push, end-of-quarter push, and final push — indistinguishable in tone from your NBA pushes. The app doesn't feel like "an NBA app with NFL bolted on" — it feels like the same calm app, broader.

## Why this comes after Phases 1 + 2

- Adding a sport when the existing UX is confusing duplicates the confusion
- Adding a sport when push is opaque doubles the operational risk
- NFL preseason starts late July / early August 2026 — timing aligns naturally with finishing Phases 1 + 2 first

## Tasks

### 3.1 Data adapters

- **New endpoint:** `app/api/nfl-game-detail/route.ts` (ESPN's NFL endpoint, mirrors `live-scores` shape)
- **Normalize NFL game state:** quarters, downs, possession, drives, score, score plays
- **New lib directory:** `app/nfl/` mirroring `app/nba/`:
  - `app/nfl/types.ts`
  - `app/nfl/lib/moment-intelligence.ts` (analogous to NBA's, tuned for NFL events)
  - `app/nfl/lib/season.ts` (regular season, postseason, Super Bowl)
- **Estimated:** ~3–4 days

### 3.2 Sport accent + brand

- Define `--nfl` and `--nfl-soft` tokens in `globals.css`
- **Color recommendation:** deep navy or turf green
  - **Not orange** (collides with NBA)
  - **Not green** (collides with WC)
- Stadium Panel mark stays the same. Sport identity moves to per-card accents only — no new logos.
- **Estimated:** ~half a day (design + token rollout)

### 3.3 Cross-sport surfaces

- **Today:** sections now mix NBA + NFL + WC items. Sort by personal relevance (followed) then chronology.
- **Following picker:** add NFL teams. Probably under a new "League" filter step (NBA / NFL / WC / Tournament).
- **Watching:** pinned games can be from any sport. PinnedCard already handles a `source: "nba" | "wc"` field — extend to `"nfl"`. Live tint uses `--nfl-soft`.
- **Following tab cards:** the existing `Follow.kind = "team"` shape already works; just verify NFL team IDs don't collide with NBA team abbreviations (e.g. `NY` is the Knicks AND the Giants/Jets — disambiguate with a league prefix or league-scoped IDs)
- **Estimated:** ~3 days

### 3.4 NFL-specific events

- **"Tipoff" equivalent:** opening kickoff → emit `kickoff` event
- **"End of quarter":** maps cleanly (`eoq-1`, `eoq-2` = halftime, `eoq-3`)
- **"Close game" recalibrated:** 8pt margin (one TD + 2pt) instead of 5; last 5 min of Q4
- **New event: `2-minute-warning`** (Q4 only) — natural NFL beat
- **Eventually: scoring plays** for the "All moments" tier (TDs, FGs, safeties). Probably opt-in via a separate flag — they fire often enough that the default tier shouldn't include them.
- **Comeback heuristic:** lift the lead threshold (NFL: 14+ point comeback) since point margins compress differently
- **Estimated:** ~3–4 days

### 3.5 Tier copy updates

- Current `PRESETS` strings are NBA-flavored ("Tipoff, end of each quarter, final")
- Two options:
  - **A.** Generic copy that covers both: "Game start, end of each period, final"
  - **B.** Sport-aware copy that adapts per-team-follow
- **Recommendation:** Option A. The push body itself (built in `dispatcher.ts buildPayload`) mints sport-specific titles ("Tipoff" / "Kickoff"). The Settings copy stays generic.
- **Estimated:** ~half a day

### 3.6 NFL game detail polish

- **Drive chart** instead of period scores
- **Possession indicator** (small chip showing which team has the ball during live games)
- **Down + distance** during live games
- **Critical discipline:** the NFL game detail surface should match the NBA one in *restraint*. Don't fall for the temptation to add 30 stats nobody asked for. Stick to the visual hierarchy: HeroMoment > ScoreModule > WatchLine > MomentsStack.
- **Estimated:** ~3 days

### 3.7 Onboarding update for multi-sport

- The Phase 1 onboarding cards need updating: "Follow your teams" should mention NBA + NFL + WC
- The Following picker's empty state probably needs a quick "Pick a league" entry point
- **Estimated:** ~half a day

## Decisions to make before starting

- **Final NFL accent color** — navy vs. turf green. Implications for the live-game tint contrast against cream.
- **How to handle the NY abbreviation collision** (Knicks vs Giants vs Jets):
  - Option A: prefix all NFL team IDs with `NFL:` internally, e.g. `NFL:NYG`, `NFL:NYJ`
  - Option B: use league-scoped IDs from ESPN directly (longer but unique)
  - Recommend: A. Cleaner storage, doesn't leak into UI.
- **Scoring plays opt-in or default for "All moments"?** Likely opt-in via a 4th tier or a sub-option, but defer the decision until you have some friends-test data on what they actually want.
- **Do we ship pre-season games?** NFL preseason is noisy and most fans don't care. Recommend: skip preseason from push entirely (regular-season + playoffs only).

## Out of scope for Phase 3

- Champions League / Premier League soccer (Phase 4+)
- App Store distribution
- Real accounts / cross-device sync
- Fantasy football integration (deliberately out of scope — would contradict the wedge)

## Risk to watch

The minute NFL ships, the app contains *more*. The temptation to keep adding (Champions League, college football, MLB, hockey) will be constant. Resist. The wedge is *calm*, not *comprehensive*. Two or three sports is plenty.
