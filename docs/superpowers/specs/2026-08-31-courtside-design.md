# Courtside — the next visual generation (design spec)

Decided 2026-08-31 with Ibrahim after a 6-agent design review of 33
mock artboards. Canvas (mocks + review boards):
https://claude.ai/code/artifact/9ccebe15-230a-463e-bfd9-85687a1f1cb3
Review findings JSON: session scratchpad `courtside-review.json`.

"Courtside" is an internal codename. It never appears in product or
store copy, same treatment as the dead word "Pin".

## The simplicity contract (the whole system is four ideas)

1. **Two rooms.** Light to browse, dark where your game is live.
2. **One hiding rule.** A hidden score is a frosted chip with
   placeholder glyphs. Tap to reveal. Nothing else is frosted.
3. **Color is identity.** A team's color lives in its dot, its season
   strip, and progress fills. Nowhere else.
4. **Big numerals carry the news.**

Everything else is furniture and can be cut without the system
noticing. Words users see: No-Spoilers, Quiet / Companion / Full
Details, Track on Lock Screen, Add to Watching, Recap, the four tab
names. Words users never see: glass, arena, Courtside, selective,
chassis.

## Rulings (the eight unlocks, decided)

1. **Arena dark: YES, scoped to rooms, conservative v1.** Dark applies
   screen-level to game detail and Watching, and card-level to Today's
   live hero (the page around it stays light). Schedule and Following
   never flip. No whole-app auto-dark, so the locked "light default,
   never auto-flip on system preference" law survives: this is product
   state, room-scoped, with a 400ms cross-fade (instant under reduced
   motion). Full-dark Today is a later evaluation, not v1. State
   machine: pregame → live → halftime (pulse rests) → final →
   10-minute grace → light. The shipped manual dark toggle remains and
   overrides everything.
2. **C4 color lock: reopened.** Porcelain #f4f3ef replaces cream as the
   light ground; the arena palette is new. Cream/vermilion/sage/blush
   retire WITH their surfaces as chapters land — never half-swapped on
   one screen. Native + store assets restyle in their own chapter.
3. **Type: YES.** Hanken Grotesk (UI 400–700) + Archivo variable at
   width 125 (display/numerals 800–900; labels at width 112).
   `--display-stretch` is a first-class token set inside Monument,
   masthead, SecHead, TabBar — zero components set width today, so
   without the token the signature silently evaporates. Native surfaces
   use SF Pro `.fontWidth(.expanded)` + `.black` as the equivalent.
   JetBrains Mono retires with its surfaces; tabular numerals via
   `font-variant-numeric`, not a mono face.
4. **Logos: KEPT.** Dots are additions, not replacements. The locked
   "do not remove team logos from web" rule stands; where no logo
   exists at row scale, the fallback is a monogram-in-dot. A bare
   color dot is never the only identity (a third of the NFL is some
   blue).
5. **Leader emphasis: ink/mute, unchanged.** Score numerals do NOT
   tint by team (this preserves the shipped Live Activity contract
   "never convey leader by color alone" and the No-Spoilers emphasis
   logic). The mocks' tinted scores are superseded by this ruling.
6. **CL league phase + multi-sport onboarding: NOT NOW.** Breaches
   "moments, not regular seasons." Champions League enters at its
   knockout moment per the roadmap. The CL mock boards are reference,
   not scope.
7. **Monday Wrap = The Margin's Monday edition.** One recap family, no
   fourth name, no new push: the existing Margin email deep-links into
   an in-app wrap surface. NFL-season ritual.
8. **Alert tiers: unchanged.** Companion global default; NFL seeds
   Quiet (as shipped 2026-08-30).

## Tokens (one page)

Light (default, browsing):
    --bg          #f4f3ef   --surface  #ffffff   --line   #e3e1da
    --ink         #17181a   --mute     #716f67   (TWO grays only —
    a third gray cannot pass AA on porcelain; #8f8b81 is decorative
    ≥18.66px bold only)
    --live        #c93d2e   (passes 4.5:1; dot + clock text)
    --chip-bg     #eeece6   --chip-line #8a8478  (≥3:1)

Dark (the arena rooms):
    --bg          #0c0d0f   --surface  #14161a   --line   #23262b
    --text        #f2f3f5   --mute     #8d939b
    --live        #ff4d3a   (dark only — it fails on porcelain)
    --chip-line   #6a7078
    --gold        #c9b476   (Super Bowl surfaces only, dark only,
    once a year; never on light)

Team colors ship ONLY through a per-team dual-ramp table (base value +
arena-lifted value) with hard floors: 3:1 dots/fills, 4.5:1 any text.
Build-time validation script; a dot that cannot clear the floor gets
the hairline ring. Precedent: SportTheme's "accent LIFTED for
legibility".

Radii: 20 card · 999 pill · 8 chip. Hit targets: 44px everywhere, the
reveal target is the whole row. Motion: one cross-fade (arena), one
develop (reveal), one haptic (reveal commit); nothing else animates.

## Redaction is data-level (blocker fix, non-negotiable)

A held score's digits never enter the DOM, the ActivityKit content
state, or the widget App Group snapshot until reveal. The chip renders
placeholder glyphs (`•• – ••`) inside a control labeled "Score hidden.
Tap to reveal." Blur/frost is decoration on top of an absent fact.
Reduce Transparency → opaque ink HIDDEN chip. VoiceOver speaks the
state, never digits. This extends the existing reveal architecture
(GameSpoilerScope / safe-text), it does not replace it.

## Native equivalents (honest platform truth)

- ActivityKit/WidgetKit: no backdrop-filter, no bundled web fonts.
  Equivalents: SF Pro expanded/black, `.blur` on Text or the shipped
  `•••` redaction, materials where the OS provides them.
- Dynamic Island compact = separate leading/trailing slots (not one
  pill); held chip lives in trailing alone.
- Notification chrome is OS-owned; the Pushes board's styling is
  aspiration for in-app surfaces only. Push copy rules unchanged.
- During rollout there is a window where the lock screen (Apple
  review) and the web app disagree; accepted, sequence native chapter
  immediately after the in-app arena chapter.

## Season strip (cohesion rule)

The strip never appears without its team's dot + name + record on the
same line. One block per week; wins fill with the team color, losses
mute, future stays quiet; blocks open their game. One strip per
followed team, only while its season runs. Under No-Spoilers the
latest unrevealed result renders as a chip-gray block, not a color.

## Chapters (each its own go/no-go; no two in parallel)

- **C0 — Spec + preview.** Tokens/fonts behind `/dev/courtside-preview`
  gallery. No user-facing change. Can start now.
- **C1 — Foundations (light).** Fonts, tokens, two-gray light chassis,
  AgateRow/SecHead/Stamp/TabBar/Monument restyle, app-wide light.
  Schedule after NFL week 1 settles (~mid-Sept); it is the big flip.
- **C2 — Redaction.** Data-level held scores + chip + reveal + a11y
  states, product-wide (also hardens today's blur weakness).
- **C3 — Arena rooms.** Game detail + Watching dark, Today dark hero
  card, state machine, reduced-motion paths.
- **C4 — Closed surfaces.** Widgets, Live Activity, Island restyle +
  store assets + marketing layer catches up (explicit, as D4 did).
- **C5 — Rituals.** Margin Monday edition in-app, quiet-day Today,
  season strip component + widget.
- **C6 — Pro.** "Hide spoilers per team" surface + unlimited alerts,
  when the monetization phase opens. Pricing undecided.

Out of scope for all chapters: CL league phase, team-color leader
emphasis, whole-app auto-dark, logo removal, any new recap name.
