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
    --ink         #17181a   --mute     #6b6961   (TWO grays only —
    a third gray cannot pass AA on porcelain; #8f8b81 is decorative
    ≥18.66px bold only. Was #716f67 until 2026-10-11: 4.26:1 on
    --chip-bg, where the selected alert tier sits. Now 4.66:1 there,
    4.95:1 on --bg.)
    --live        #c93d2e   (dots and fills) · --live-text #bb3729
    (clock and stamp text, 4.82:1 on --chip-bg)
    --chip-bg     #eeece6   --chip-line #8a8478  (≥3:1)

Dark (the arena rooms):
    --bg          #0c0d0f   --surface  #14161a   --line   #23262b
    --text        #f2f3f5   --mute     #8d939b
    --live        #ff4d3a   (dark only — it fails on porcelain)
    --nfl-text    #5c85c9   (sport color as TEXT in the arena: the live
    status line. --nfl #4a78c4 stays the fill; as text it read 4.42:1.
    Added 2026-10-11, same split as --live / --live-text.)
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
Amended 2026-10-11 (owner, persona sweep): on a linked card (Today's lead
Monument) the hidden chips are placeholders and every tap opens the game;
one explicit "Show score" control reveals in place. The chip-as-reveal
target holds everywhere else (agate rows, the game page itself).
Amended 2026-10-11 (close-out of the persona sweep):
- Live state. The NFL situation line ("PIT ball · 1st & Goal at IND 1")
  sits under a live score on Today, Watching and the game page. Its one
  mark is a small-caps RED ZONE in the surface's full ink, never a color.
  Hidden games get no situation and no margin wording, only a neutral
  period line. Breaks read "End of 1st". Rail ends read Kickoff / Final
  (Tip-off for the NBA).
- Watching's "what changed" note ("Was 7–6") tints the changed score in
  --live-text until the row has been on screen about 3 seconds.
- Larger Text. Reading text of 24px and under is rem (a gate test holds
  it). Display numerals and heroes stay px. The masthead and tab bar keep
  one size, like native bars. Agate rows move their score, stamp and
  arrow to a second line when the text outgrows one (container query in
  the row's own em), and Monument team names cap at 28px. iOS Text Size
  reaches the web view through the -apple-system-body probe in
  app/layout.tsx (88% to 200%).
- VoiceOver. A linked game speaks one sentence (scores, status in words,
  the action), never scores for a hidden game. Section heads are h2.
Amended 2026-10-01 (owner): on the closed surfaces the score numerals
roll to their new value when the score changes (SwiftUI numeric text),
and a reveal there pushes the chip out as the digits come up. The haptic
is a light impact through @capacitor/haptics, native only.

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

## C4 status (2026-09-28): built, simulator-verified, awaiting owner look

Contact sheet (every state, plus the real simulator captures):
https://claude.ai/artifact/8fx6XJEiWYvrtBzRXfaAwo

- Native tokens live in `ios/App/NoNoiseWidgets/CourtsideTokens.swift`,
  each hex annotated with the CSS variable it mirrors;
  `app/lib/native/courtside-parity.test.ts` fails when they drift.
- Every state renders to PNG on the simulator through
  `scripts/native/render-widget-snapshots.sh` (the `ios/WidgetSnapshots`
  package compiles copies of the extension sources, never edit those).
- Real-host check: DEBUG builds accept `-NNDemoLiveActivity live|held|final`
  (AppDelegate.swift), started 15s after launch so the web layer's launch
  reconcile does not end it.
- Found on the real lock screen and fixed: ActivityKit applied
  `minimumScaleFactor` eagerly (a trailing "Packers" at ~80% beside
  "Lions"), so score-row names no longer scale.
- The widget snapshot carries placeholder scores for held games (web
  change, compatible with v1.0.3's decoder, which never draws a score
  while `redacted` is true).
- Motion (2026-10-01, owner go, rides v1.0.4): score numerals roll on
  change on the lock screen, the Dynamic Island and the live widget
  (`ScoreRow`), a reveal pushes the held block out as the digits come up,
  and the app gives a light haptic on reveal
  (`app/companion/native/haptics.ts`, skipped on binaries without the
  plugin). The DEBUG demo `live` scores twice, 10s and 20s after the tile
  appears, so the roll can be watched. Lock only after the tile appears
  (ActivityKit starts activities from the foreground only). A locked app
  is suspended within seconds, so the demo holds a background task until
  its second score.

## C4b: held scores out of ActivityKit (BUILT 2026-10-13, native ships in v1.0.5)

Built as designed. Server is live and backward compatible: builds before
C4b never report `heldCapable`, so they keep getting real digits.
- Server: `live-activity-held.ts` (the fan-out rule, tested),
  `StoredActivityToken` flags, `/api/push/live-activity-reveal` (returns
  the scan's latest score, then marks the token revealed; a token is
  optional for local tiles).
- Web: `liveActivityHeldCapable()` asks the build once. A redacted tile on
  a capable build starts with zeros and `held`. Token registration
  forwards `redacted`, `heldCapable` and `revealed` from the native event.
- Native: `ContentState.held`, the plugin's `capabilities`, the richer
  pushToken event, views draw held when `state.held`, `RevealScoreIntent`
  calls `RevealClient`. DEBUG demo: `-NNDemoLiveActivity held` starts with
  no digits, and `-NNDemoState` takes a real `gameId` and `sport` so the
  reveal can fetch a real score.
- Not built: the replay-lab profile from point 5 (the fan-out table test
  covers the rule).

Design:

Today the server pushes real digits to every Live Activity token and the
tile only hides them. Closing the redaction rule for ActivityKit:

1. Registration carries two flags per token: `redacted` (the start
   attribute) and `heldCapable` (native build >= the C4b build).
2. Fan-out: a token that is redacted, held-capable and not revealed gets
   `awayScore: 0, homeScore: 0` plus `held: true`. Every other token gets
   real digits, so older builds never show a placeholder as a score.
3. Swift: `ContentState.held` (decodes false when absent). A held state
   always renders the chip, whatever the reveal flag says.
4. Reveal: `RevealScoreIntent` fetches the current score for its game,
   updates the activity locally, and tells the server the token is
   revealed so later pushes carry digits. No network, no reveal: the tile
   stays held and a tap opens the app.
5. Tests: fan-out table (redacted x capable x revealed), decode defaults,
   and a replay-lab profile that asserts no held token ever receives a
   digit.
