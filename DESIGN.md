# No Noise Scores — Design System

Source of truth for tokens, type, components, and language rules.
Adopted in the cohesion-pass refactor. Update this file whenever a rule
changes — visual diffs without a DESIGN.md update are bugs.

## Principles

1. **Calm first.** Default state is quiet. Color, motion, and weight are spent only when something has changed.
2. **Signal second.** A live game looks different from a final — but the difference is a pill and a meter, not a whole new card.
3. **Drama only when earned.** Closeness, late-game, swing — those earn tension. A regular score does not.
4. **Compact but breathable.** Cards know their content. No empty container chasing a small bracket.
5. **Premium, not loud.** If it looks like a sports poster, it goes.
6. **Sport personality after the No Noise system.** NBA orange and WC green are accents on a shared chassis — never the chassis.
7. **Every component belongs to the same product.** A button on Pick Your Country and a button on Series Board are the same button.

## Tokens

Defined in [app/globals.css](app/globals.css). Always reference via `var(--…)`, never inline hex.

### Surfaces (neutrals — the chassis)
| Token        | Value     | Role                                    |
|--------------|-----------|-----------------------------------------|
| `--cream`    | `#f5f1ea` | Page surface                            |
| `--cream-2`  | `#ede8df` | Inset / tab track                       |
| `--paper`    | `#fbf8f3` | Card surface                            |
| `--ink`      | `#1a1208` | Primary text, primary button            |
| `--mute-1`   | `#8a7a66` | Secondary text                          |
| `--mute-2`   | `#a89880` | Tertiary text, empty-state dots         |
| `--line`     | `#e8e0d4` | 1px borders only                        |

### Sport + system accents (strictly limited)
| Token        | Value     | Allowed where                             |
|--------------|-----------|-------------------------------------------|
| `--nba`      | `#e85d04` | Inside NBA surfaces only                  |
| `--wc`       | `#1e6b3c` | Inside WC surfaces only                   |
| `--up`       | `#2e5bd7` | Upcoming / scenario — system use only     |
| `--critical` | `#c9362b` | Live / critical — system use only         |

### Status tones (one vocabulary, one surface)
Four tones. Anything outside this set should not exist.

| Tone       | Background var               | Foreground var             |
|------------|------------------------------|----------------------------|
| `live`     | `--status-live-bg`           | `--status-live-fg`         |
| `upcoming` | `--status-upcoming-bg`       | `--status-upcoming-fg`     |
| `final`    | `--status-final-bg`          | `--status-final-fg`        |
| `current`  | `--status-current-bg`        | `--status-current-fg`      |

`live` pills breathe (opacity fade, 1.8s). No other animation on chips.

## Typography

Loaded in [app/layout.tsx](app/layout.tsx) via `next/font/google`.

### Display — Anton (`var(--font-display)`)
**ONE moment per screen. Allowlist:**
- Pick Your Country (entry hero)
- First Whistle Loading (loader)
- Series Board (header)
- NBA Finals (header)
- World Cup 2026 (header)
- Your Road / Your Path (header)
- Today (NBA home title)
- Countdown number (WC hub)

**Never** for: tabs, chips, scores, table numbers, body copy, eyebrow labels, badges, button labels.

### Body — Inter (`var(--font-body)`)
Everything else. Weights 400 / 500 / 600 / 700.

| Role             | Size / weight             |
|------------------|---------------------------|
| Score row        | 22 / 700 tabular-nums     |
| Card title       | 16 / 700                  |
| Body copy        | 14 / 500                  |
| Metadata         | 13 / 600                  |
| Caption (muted)  | 12 / 600 mute-1           |
| Eyebrow          | 11 / 600 0.12em uppercase |

### All-caps budget
Reduce by ~50%. Sentence-case tab labels, filter chips, and section headers. Reserve uppercase for: brand wordmark, eyebrow micro-labels, status-pill copy.

## Components — the allowlist

After the cohesion pass, exactly **one** of each exists. Live in `app/shared/`.

| Component    | Replaces                                                          |
|--------------|-------------------------------------------------------------------|
| `StatusPill` | All `getStatusClasses` chips, `MomentStakePill`, `WCPill`         |
| `Segmented`  | NBA tab buttons, Series board buttons, WC viewMode buttons        |
| `FilterChip` | `FilterPill` from score-controls.tsx                              |
| `AppCard`    | Game-card, series-card, fixture-row, drawer score-hero chassis    |
| `Button`     | Inline `<button>` chrome with variants `primary/secondary/accent/ghost` |
| `TeamRow`    | `TeamLine` in game-card, inline rows in drawer/series-card        |
| `KeyMoment`  | New — curated row in drawer's Moments tab                         |
| `Tension`    | `TensionBar` (rewrite to 3px single-gradient)                     |
| `Watch`      | New — channel-only render, never raw broadcast IDs                |
| `Scenario`   | `ProbabilityRing` (the 42/36/22% rings — deleted)                 |
| `Eyebrow`    | Inline `font-display text-[0.55rem] uppercase` patterns           |

## Cards

- **Radius:** 14px outer
- **Border:** 1px `var(--line)`
- **Accent:** 2px left edge in status color, only when state demands it
- **Padding:** 14px
- **No top color strip. No drop shadow. No second border.**

Hierarchy inside a card:
1. Status pill (top-left) — what is this and when
2. Teams + scores — the read
3. Caption — the human reason in one line
4. Meta (top-right) — venue, channel, secondary detail

## Language rules

- **Never "NEUT".** Neutral events render as plain English: "Timeout", "Foul", "End of Q4", "Whistle".
- **Never raw broadcast IDs.** "ESPN" is enough — not "ESPN / ERADM / 13715732".
- **Never "Line unavailable".** Absence of betting data is not a row. Betting copy is removed entirely.
- **Never fake percentages.** Without a real model, scenario language is qualitative: "Most likely / Possible / Long shot".
- **Play-by-play uses sentence form.** "Brunson dagger 3 from the wing", not "BRUNSON · 3PT".

## Sport-specific notes

### NBA Playoffs
Keeps: team logos on web, favorite team dropdown, My Team filter, share cards, playoff series context, sports-day cutoff.

### World Cup 2026
Keeps: countdown (allowed editorial moment), Pick Your Country hero, group draw board, country colors as accents only.

### Share cards
Footer: `nonoisescores.app · @nonoisescores`. Instagram only via the footer handle — no in-app Instagram buttons.

## Out of scope

The following do not appear on default surfaces:
- Betting lines / spreads / over-under / "Line unavailable"
- Fake probability percentages
- Pulse-band gradients, conic rings, breathing card borders
- Card top color strips
- The "32px HIGH PULSE" word-as-art treatment
