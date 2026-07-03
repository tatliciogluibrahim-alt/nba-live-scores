# Design uplevel research — synthesis

Date: 2026-07-02
Feeds: the Today-mobile editorial redesign (direction round → design spec).

## Provenance and confidence labels

Two deep-research harness runs both hit session usage limits mid-verification
(every abstain was counted as a refutation — an infra artifact, documented in
the salvage files). One targeted agent completed the palette angle. Labels:

- **[V]** — adversarially verified 3-0 or 2-0 by the harness.
- **[P]** — unverified by panel, but extracted with direct quotes from primary
  sources (Apple HIG, WWDC sessions, Material spec). Low falsehood risk.
- **[S]** — secondary source, unverified. Verify by eye before load-bearing use.
- **[K]** — model knowledge, no fetched source. Verify by eye.

Companion doc: `~/.claude/docs/research/2026-07-02-anti-slop-design.md`
(Ibrahim's anti-slop calibration; its NNS collision map is summarized below).

## The thesis the evidence supports

**Calm is the baseline, not the ceiling.** The app currently has one register
(quiet) applied uniformly, which produces both failures at once: cream
monotony and live-inertness. Print editorial solves this with an earned
second register — ink-dense, large-scale — that only the lead story and live
moments get. Every angle of the research feeds this one move.

## Principles (the composition grammar)

1. **One lead, one deviation.** A strict modular grid earns exactly ONE
   broken-scale element per surface; more than one produces chaos. Hierarchy
   comes from letting the most important element earn a larger size, not from
   decoration. [S — Mario García, garciamedia.com]
2. **Modules differ by size and position, never by identical containers.**
   Newspaper composition is modular, but blocks are differentiated by
   arrangement within the grid — "pages within pages." [S — Smashing]
3. **Boxes only where they earn it.** Enclosure (common-region) perceptually
   overrides proximity, adds cognitive load, and taxes space. Cards remain
   correct in exactly three cases: a CTA that must stand out, internally
   complex layouts, and self-contained interactive units. Everything else
   groups by proximity with the rule: internal spacing < external spacing.
   [S — smagin.fyi "padding over cards"]
4. **Reading gravity.** Scanning homogeneous content runs top-left to
   bottom-right (Gutenberg principle / Edmund Arnold). The first viewport is
   the newsstand glance — it must win or lose the reader. Lead top-left,
   terminal action bottom-right. [S — Smashing]
5. **Double-stranded type scale, ~10x span.** Editorial practice endorses
   display-to-body spans near 10.5x (Brown's 18px body → 190px display,
   golden-ratio strands). Two strands (display + meta/agate) through one
   ratio fill each other's gaps. NNS today spans ~2x (11px → ~22px); the
   redesign needs true display moments (~44-88px+) against the agate layer.
   [S — Tim Brown, A List Apart]
6. **Numbers are the product's photography.** A scores product's imagery is
   its numerals. Tabular lining figures for data columns and all-caps
   settings; oversized numerals double as graphic texture (vintage
   programmes, boxing posters). Optical sizing where available. [S/K]
7. **Ink-field inversion is the second register.** Solid ink blocks on cream
   with reversed text — the Gentlewoman/Monocle device — create punch without
   new hues. Reserve for: the lead story and LIVE states. This one device
   addresses cream monotony and live-inertness simultaneously. [S — Eye on
   Design, Design Observer]
8. **Paper tone stepping replaces borders.** Depth from 2-3 stacked warm
   neutrals (NNS already owns --cream / --paper / --cream-2 — use them as
   *fields*, not as card fills inside borders). [S]
9. **Accent scarcity.** The Fence sometimes runs whole spreads with no accent
   at all; Monocle reserves red for specific emphasis. Accent = live + lead
   only; some screens show none. Scarcity amplifies. [S — It's Nice That]
10. **Rules, not boxes.** Hairlines (0.5-1pt) as the structural skeleton —
    already NNS's best existing instinct (section rules + eyebrows). Extend
    it downward to replace the boxes. [S]
11. **Mono only where it does data work.** Tracked-mono eyebrows on every
    section are catalogued "AI editorial scaffolding." The agate/box-score
    tradition is mono's legitimate home: keep mono for data (clocks, meta,
    box scores), demote it as decorative section chrome. [Ibrahim's anti-slop
    research + S]
12. **Liveness = data visibly changing, not decoration moving.** Apple: animate
    numbers with numeric count transitions on real changes only; brief precise
    feedback beats prominent animation; motion never the sole channel. [P]

## Device catalog — calm-but-alive live states

Concrete norms first [P unless noted]:
- Live Activity animation ceiling: **2 seconds**, transitions limited to
  scale/opacity/move + content-replace.
- Utility-tick durations: **50-200ms** (Material short class, Standard easing
  cubic-bezier(0.2, 0, 0, 1)). Exits faster than entrances (dialog 150ms in /
  75ms out).
- Ambient motion (breathing dots, auto-advancing): the ONLY class allowed
  700-1000ms+, and it should be rare. NNS's 1.8s breathing pulse is
  compliant.
- Update discipline: refresh/animate only when underlying data actually
  changed; reserve alerts for what genuinely needs attention.
- Reduced-motion: minimize to essential motion; replace with state
  color/weight changes.

Devices:
1. **Ink-field live inversion** — a game module flips to solid ink with
   reversed numerals while live; returns to cream at final. The state IS the
   color change. [S/K, the register device]
2. **Rolling-digit score transition** — odometer-style numeric count
   transition on score change; Apple's sanctioned device for live numbers.
   Implementable via NumberFlow (dependency-free, a11y-conscious) or Odometer
   (CSS-transform based). Verify a11y by eye before adopting. [P]
3. **Flash-then-settle** — score change flashes accent then settles to ink
   within the short-duration class. NNS's existing `no-noise-score-flash`
   is this device; keep, tune to norms. [P-aligned]
4. **Progress rail over stream** — Flighty's verified pattern: a minimal
   progress artifact (rail + counters) instead of streaming updates; NNS
   already ships this on the Live Activity — bring the same rail into the
   in-app live module. [V]
5. **Airport-board hierarchy** — one line per live game, decades-tested
   info order; the model for multi-live states (Live Room, scoreboard). [V]
6. **Anxiety-reduction as the goal** — Flighty's rationale for glanceable
   persistent status: "information always being there" removes re-checking.
   This is literally NNS's brand promise; make live design decisions against
   this test. [V]
7. **Weight shift when live** — heavier numeral weight + identity color while
   live (WWDC live-surface guidance). [P]
8. **Clock as typographic element** — elapsed time set in the agate strand,
   ticking via content-replace, not decoration. [K]
9. **Haptic pairing (native)** — subtle haptic on goal/lead-change paired
   with the visual, motion never the sole channel. [P]

## Palette richness techniques (no new hues)

1. Ink-field inversion (above — the headline device). [S]
2. Tone stepping: cream → paper → a third warm step as layered fields. [S]
3. Accent scarcity discipline (above). [S]
4. Oversized numerals as texture (large ghosted/cropped figures as section
   anchors — vintage programme device). [S/K]
5. Hairline skeleton (above). [S]
6. Asymmetric placement within a strict grid (breaks feel designed, not
   random). [S]
7. Duotone/halftone texture — available but risky; reads decorative if used
   without a reproduction context (photos). Hold unless imagery enters. [S]

## Reject list (loud / feed-like / gambling-adjacent)

- Red badge counts (Zeigarnik pressure, "red dot blindness") — ESPN.
- Autoplay video, ad carousels, forced-scroll national feeds optimized for
  session length — ESPN.
- Stat glut without whitespace — Sofascore density.
- Odds chips woven through editorial content — theScore.
- Anchoring/sludge dark patterns; hierarchy that favors action over safety —
  betting UX canon (PMC taxonomy).
- From the anti-slop catalog: decorative eyebrow scaffolding, hero-metric
  card stacks, uniform bordered card grids, steering-list type shipped
  without a stated production-face intent.

## Verdict on the five diagnosis points

1. **Card monoculture — CONFIRMED, refined.** De-card everything except units
   passing the three-cases rule (the live module qualifies; most else does
   not).
2. **No lead story — CONFIRMED.** One-deviation rule + reading gravity +
   above-the-fold glance test.
3. **Timid type scale — CONFIRMED.** Editorial practice runs ~10x spans;
   double-stranded scale is the mechanism.
4. **Cream monotony — CONFIRMED.** Fix is material, not chromatic: ink
   fields, tone stepping, accent scarcity. No new hues needed.
5. **Live inertness — CONFIRMED.** Second register + numeric transitions +
   progress rails, governed by Apple/Material discipline so it stays calm.

Sixth, from the anti-slop calibration: the current composition is the
catalogued "tasteful AI editorial" recipe (cream + eyebrows + stat cards +
steering-list type). Naming, copy voice, and the craft layer are
differentiators and survive. The redesign must pass the reskin test and the
recipe audit (never 2+ catalogued tells on one surface without a stated
product reason — NNS's product reasons: scores product → big numerals; agate
tradition → data mono; calm-as-product → quiet baseline register).

## Source index

Run 1 (composition/type): smashingmagazine.com (newspapers piece),
alistapart.com/article/more-meaningful-typography (Brown),
garciamedia.com (García modular design), smagin.fyi/posts/padding-over-cards,
typenetwork.com (figure styles). Salvage: session scratchpad
`design-research-salvage.md`.

Run 2 (live/motion): developer.apple.com HIG Motion + HIG Live Activities +
news/?id=970ncww4 (Flighty, [V]x3) + WWDC 2023 session 10194,
m3.material.io motion tokens, m2.material.io speed,
web.dev/prefers-reduced-motion, number-flow.barvian.me,
github.hubspot.com/odometer. Salvage: `design-research-run2-salvage.md`.

Palette agent: designobserver.com (Monocle), eyeondesign.aiga.org
(Gentlewoman), itsnicethat.com (The Fence), envato Swiss style,
designyourway.net (duotone), c2paint.com (warm neutrals), printwiki.org
(hairline rule), wooter.com (sports typography), scoutcast.ai (sports app
critique), medium.com Sofascore case study, braze.com (red-dot badging),
pmc.ncbi.nlm.nih.gov/articles/PMC12426356 (gambling dark-pattern taxonomy),
lickability.com/blog/apple-sports.
