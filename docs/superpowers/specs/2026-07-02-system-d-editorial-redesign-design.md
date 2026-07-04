# System D — the editorial redesign (design spec, v2 post-red-team)

Date: 2026-07-02
Status: direction locked (Broadsheet × Programme). v2 integrates the UX
and PMM red-team findings (adjudication log in §14). Pending Ibrahim's
review, then writing-plans.

Feeds from:
- Research synthesis: `docs/superpowers/research/2026-07-02-design-uplevel-research.md`
- Mockups: `docs/superpowers/design-directions/` — `d-mix` (Today WC),
  `d-nba` (peak register), `d-nfl` (density), `d-tournament`,
  `d-following`, `d-watching`, `d-game`, `d-docking` (the §8 states).
  Archive: `a-broadsheet`, `b-programme`, `c-instrument`.
  Mocks are direction studies; every mock-level defect caught by the
  red teams is recorded in §13 and fixed at build, not re-mocked.

## Thesis

Calm is the baseline, not the ceiling. The app gets a register ladder:
quiet editorial ground, an ink register for live, an accent register
for peak moments. Loudness is earned by stakes.

## 1. The register ladder (the core law)

- **Rung 1 — Agate (cream).** Resting content: unboxed ruled rows on
  cream.
- **Rung 2 — Ink field.** Live content, deployed per §6. Bounded: a
  field shows at most 5 board rows; overflow collapses behind
  "+N MORE LIVE → WATCHING" (ranked by closeness/stakes).
- **Rung 3 — Accent field.** **The elimination law (v2):** the field
  fires only when *someone's season can end tonight* — elimination
  games, clinch-capable Finals games, WC quarterfinal onward for a
  followed team, both Finals (NBA Finals, WC Final), NFL playoffs and
  Super Bowl when built. NBA Finals games 1-4 lead the *ink* band, not
  the field. Never for non-live content: no promos, no announcements,
  no "knockouts begin Saturday" — that is agate.
- **One-deviation law:** at most one rung-3 field per screen, always
  the lead. Two peak games live → closest takes the field.
- **Scarcity law:** a quiet day is allowed to be entirely rung 1 with
  zero accent pixels. Rung 2 only when genuinely live.

## 2. Layout grammar

- **Chrome (unchanged IA — declared explicitly, v2):** the mobile
  bottom TabBar (Today / Following / Watching) and the Settings entry
  persist exactly as today; the desktop sidebar persists. The mocks
  omitted chrome to isolate the content grammar — production keeps all
  of it, restyled to the system (TabBar: cream bar, ink icons, mono
  labels, hairline top rule; active tab ink-weight). Nothing in the IA
  is added or removed by this redesign.
- **Masthead (app tabs):** mono date · BrandMark chip + wordmark ·
  live count ("3 LIVE", tappable → Watching, styled per the affordance
  law; hidden when 0). Heavy 2px rule beneath. Leaf screens use the
  crumb bar.
- **The lead:** kicker (dot · LIVE · clock · context · broadcaster,
  carrying slate index "01") → stacked monument rows → deck → progress
  rail. The screen's single scale deviation. Monument v2 changes:
  vertical gap between the two team rows tightened so the score pair
  reads as one unit; 3-digit NBA scores width-tested at 390px; at
  final, winner row full ink / loser row muted (the shipped Game Pulse
  "ink = ahead, mute = behind" language, applied at rest).
- **Board rows (in fields):** index · matchup · score · minute stamp.
  One line per game. Optional per-row rail on Watching.
- **Agate rows:** index · matchup/name · note · score · stamp, hairline
  separators, proximity grouping.
- **Section heads:** mono label + mono count, heavy 2px rule. Wrapped
  window sections on dense days (NFL early window) collapse behind
  their count (tap to expand).
- **Index numerals:** run 01… continuously; the lead carries 01 in its
  kicker so the slate never appears to start at 02.
- **De-boxing (three-cases law):** enclosure = CTAs, stamps, register
  fields only.
- **Affordance law (v2, from UX-C2):** every tappable row/monument
  carries exactly one affordance: a right-aligned mono chevron (→) at
  the row edge, plus a pressed state (bg `--paper` flash / opacity on
  ink). The monument is tappable as a whole (chevron in the kicker
  row). Non-tappable by design: section heads, the follow *label*,
  stamps that are pure state (FT, minutes), deck text. The de-chipped
  follow line IS tappable per token: min 44px hit areas, underline-on-
  press; long-press is banned.

## 3. Type system (double-stranded scale)

Unchanged from v1 (display strand 100→15px, agate strand 21→9px,
tabular lining figures, mono only for data). v2 additions:
- **Contrast law (UX-M6):** every text/on-color pair measured against
  WCAG AA before build. Known failures to fix: cream-dim secondary on
  accent fields (darken to full cream or ink), `--mute-2` mono at
  9-10px on cream (bump size or darken). Agate sizes respond to
  Dynamic Type (rem-based, not hardcoded px).
- Production-face evaluation note unchanged (off the steering lists;
  prototype faces stay for now).

## 4. Stamp taxonomy (v2 — fill maps to loudness)

The fill of a stamp now encodes alert loudness, so the visual weight
agrees with the word (UX-M1, PMM-2):

- `OFF` — faint outline, muted text (lightest)
- `QUIET` — outline, ink text
- `COMPANION` — filled ink
- `FULL` — filled ink, heavier border/weight (loudest)
- State stamps unchanged: minutes (live), `FT` (outlined muted),
  kickoff times, `GOAL` (cream-on-ink), `GAME 7` (ink-on-accent),
  docking states (§8).

**The tier legend (teaches the words):** first exposure to Following
renders a one-time legend row under the section head — "QUIET: start
and final. COMPANION: key moments. FULL DETAILS: everything." —
dismissible, and permanently reachable via a small "?" affordance on
the section head. Stamp text `FULL` is the abbreviation of the locked
label "Full Details"; the legend always spells it out.

## 5. Accent law (v3 — C4 color lock, 2026-07-03)

Ibrahim locked direction C4 after the shipped v2 system read "too
beige" on device (docs/superpowers/design-directions/color-c4.html is
the visual source of truth; color-index.html holds the losing
candidates).

Three additions to the palette, all tokens:
- **Brand chrome — vermilion `--brand: #b8391f`.** Lives on chrome,
  confidently: the masthead rule, the masthead live count, index
  numerals, section-head counts, the active TabBar tick. NOT on
  stamps (kickoff/FT stamps stay ink-outlined), NOT on body content.
- **Section plates.** The not-now registers sit on tinted paper:
  `--plate-next` (sage #e4e6d3) under UP NEXT-class sections,
  `--plate-wrap` (blush #eddfd0) under QUIET WRAP / WRAPPED-class
  sections. Full-bleed stock changes, never boxes. The lead and live
  registers stay cream/ink.
- **Sport accents pull back to live-only** (their v2 slots: breathing
  dot, LIVE·clock kicker segment, rail fill, rung-3 peak fields).
  Brand chrome replaces the sport color in at-rest chrome.

Dark mode: variants are DESIGNED, not auto-flipped — vermilion
brightens for dark ground legibility; plates become elevated warm-dark
steps; the BrandMark stays literal. Glyph law unchanged (pulse = live,
exclusively).

## 5-old. Accent law (v2, superseded)

Accent slots: (1) breathing live dot, (2) LIVE·clock kicker segment,
(3) rail position/fill in fields, (4) rung-3 peak fields (live only).
Removed in v2: table "advancing" dots (the cut line alone tells the
qualification story — one job per glyph).
**Glyph law (UX-M2):** the pulsing dot means live, exclusively. NFL
possession gets a distinct static mark (small solid square ▪ before
the possessing team). Nothing else pulses.
Mixed-sport days: each game carries its own sport accent; chrome stays
ink.

## 6. Ink-register deployment per surface

Unchanged table from v1 (Today: ALSO LIVE band · Following: one
cross-link band · Watching: full Live Room · Game: MATCH EVENTS ·
Tournament: YOUR PATH), with the rung-2 bound from §1 (max 5 rows +
overflow link) and collapsed wrapped-window sections on dense days.

## 7. Motion spec

Unchanged from v1 (numeric count transitions 300ms, utility 50-200ms,
1.8s breathing dot, one lead-rise entrance, exits faster, update
discipline, reduced-motion swaps, haptics on dock/goal/lead-change,
transform/opacity only).

## 8. Lock-screen docking — the one-tap model (v2, hardened)

**The problem (founder):** docking a game to the lock screen is
invisible: pin → open game → leave app → a background poll may start a
tile. No control names the lock screen, no confirmation, no slot
visibility.

**The model:**
1. **One verb per platform, each telling the truth. "Pin" dies as a
   user-facing word everywhere.**
   - Native iOS: **"Track on Lock Screen"** (filled ink pill) — adds to
     Watching AND starts the Live Activity immediately (direct bridge
     call; the poll remains as reconciler only).
   - Web/PWA: **"Add to Watching"** (filled ink pill) — same Watching
     mechanic, no lock-screen claim it can't keep. Caption: "On the
     iPhone app, tracked games also live on your lock screen."
2. **Permission preflight (UX-C4):** before the optimistic flip, check
   Live Activities permission. If denied/off: no fake success — the
   control renders "TURN ON LIVE ACTIVITIES" (outlined) and taps
   through to a calm explainer with the iOS Settings path. The game is
   still added to Watching, and the copy says exactly that.
3. **State flips under the finger:** on success — haptic + control
   flips to the outlined held stamp "◉ ON YOUR LOCK SCREEN · TAP TO
   REMOVE".
4. **Proactive slot meter (UX-M4/M7):** the meter reads "2 OF 3 LOCK
   SCREEN SLOTS" *next to the control* before the cap is hit, and sits
   as a first-class row at the top of Watching's Live Room with "◉"
   marks on the three slot-holding rows. At cap, a 4th game's control
   reads "LOCK SCREEN FULL · 3 OF 3" (outlined, disabled) with "remove
   one in Watching" guidance.
5. **Lifecycle (UX-C4):** a docked game auto-releases its slot at
   final (tile ends per existing behavior; the meter decrements).
   Freed slots do NOT auto-fill — the user chooses (control, no
   surprise). All old pin copy ("Pinning keeps this game in Watching",
   "unpin") is deleted app-wide.
6. **Placement:** game detail (primary), Today lead kicker (compact
   "TRACK →" stamp-affordance, full verb on detail), Watching rows
   (state marks + meter). Zero-tap path: the shipped kickoff push
   offer, same verb in its copy.
   **Terminology:** "Live Activity" is never our feature's name; it
   appears only when naming the iOS system setting in the
   permission-denied path ("Turn on Live Activities"), because that is
   the literal toggle label users must find.
7. **Visualized:** `d-docking.html` mocks the four control states
   (default / tracking / full / permission-denied) — the red teams'
   non-negotiable.

## 9. States (v2)

- **Quiet day:** rung 1 only; masthead count hidden; "Quiet for now."
  display + NEXT UP agate + brief footer. Zero accent pixels.
- **Fresh install:** the lead slot is the setup moment; one CTA.
- **No-Spoilers (v2, UX-C5 — full suppression):** the numerals hide
  AND the deck's fact string is suppressed (existing safe-text rules),
  AND the MATCH EVENTS field collapses to a single "HIDDEN · TAP TO
  REVEAL" row. Kickers drop clocks that leak state. Nothing on a
  spoiler-gated game names a scorer, count, or margin anywhere on the
  surface. Reveal semantics unchanged (per-game, session-scoped).
- **Dark mode:** ground flips warm-dark; rung-2 becomes the elevated
  `--paper`-dark panel with cream rules; **the portable live cue (v2,
  UX-m9)** is the accent left-edge tick + dot, present in BOTH modes,
  so the learned signal survives the theme switch; the field/panel is
  reinforcement, not the only cue. Rung-3 keeps dark accent variants;
  reassess its night loudness at D4 with the harness.

## 10. Sport translation table (v2 deltas)

As v1, plus: rail endpoint labels are sport-true and never say FINAL
while live ("90′" WC · "0:00" NBA/NFL); possession = ▪ static mark;
section-count nouns are sport-correct ("2 WRAPPED", "1 MATCH" for
soccer, "1 GAME" for NBA/NFL — never "FIXTURE" for US sports);
Summer Soccer stays the in-app IP-safe tournament name (deliberate),
marketing/SEO uses "World Cup" where lawful.

**Result-state laws (v2.1, QA pass):**
- **Draws (soccer):** at full time with a level score, NO winner
  emphasis — both codes equal ink, stamp `FT`. The winner-emphasis law
  applies only when a winner exists. Group-stage draws are routine;
  the grammar must not imply one.
- **Extra time / shootouts (soccer knockouts):** clock reads "ET 103′";
  rail extends its track by an ET segment (dashed) past the 90′ mark;
  decided-after stamps: `AET` / `PENS` (outlined) replace `FT`;
  shootout state shows "PENS 3–2" in the score slot with the 90′ score
  in the deck. Winner emphasis applies to the tie winner.
- **Overtime (NBA/NFL):** clock "OT 2:41" (2OT, 3OT…); rail holds at
  full with an `OT` stamp beside the endpoint. Stamp at rest: `F/OT`.

**10b. New-sport onboarding checklist (future-proofing):** any sport
enters the system by answering eight questions, nothing more — accent
token + dark variant; clock format; rail segmentation (halves /
quarters / innings / sets — the rail abstraction holds for
non-clock sports: innings ticks, set ticks); period names for stamps;
peak-register triggers (elimination law applied to that sport's
stakes); deck fact source; possession/serve-style marker (if any);
section nouns. Champions League (Phase 23+) additionally defines the
two-leg tie: aggregate rides the deck ("Agg 3–2") and tie rows carry
an `AGG` stamp — no new primitives required.

## 11. Component migration map

Unchanged from v1, plus: TabBar restyle (not removal); pin controls →
docking verb states; ClosestChip copy generalized (see §13.7).

## 12. Phasing

- **D1 — Foundation + Today (mobile):** tokens/utilities (stamps,
  secheads, rails, fields, affordance chevrons + pressed states),
  masthead + TabBar restyle, Today all states (incl. No-Spoilers full
  suppression).
- **D2 — Game detail + Watching + §8 docking** (bridge tap-path,
  permission preflight, meter, lifecycle).
- **D3 — Following (tier legend) + Tournament.**
- **D4 — Desktop propagation + dark-mode registers + polish.**
Each phase gates on the screenshot harness + lint/build + the ship-gate
checklist. Copy changes go through copy-voice at build.

## 13. Copy + mock-defect fix list (bound at build)

1. "ALL 16 TIES" → "ALL 16 MATCHES" (US "tie" = draw).
2. ClosestChip on soccer: "Switch to one-possession game" → "Switch to
   the closest game" (also a live copy fix in the shipped app;
   "one possession" stays NBA-only).
3. Brief CTA names the product: "Want The Margin? A calm morning recap
   of what your follows did."
4. "COMING UP" → "UP NEXT" (locked editorial name).
5. Following count noun: "6 FOLLOWS" (adaptive, never lies for
   mixed-sport circles).
6. Alert-slots line gains its why: "Alerts on your first 3 follows are
   free."
7. Winner emphasis at final in agate rows (winner code+score ink,
   loser muted).
8. Slate index starts at the lead ("01" in the kicker).
9. Follow-line dedupe (team + its series render once: "OKC · SA
   SERIES" implies OKC).
10. "SYNC" → "SYNC DEVICES" (it is the shipped QR circle-sync).
11. Tournament mock-data coherence (PLD totals, path-stage label) —
    mock artifacts only.
12. Dash discipline: ranges/scores are en-dashes at the token level;
    em-dashes remain banned in copy.
13. The green "Knockouts begin Saturday" band → agate row (rung-3 ban
    on non-live content).

## 14. Red-team adjudication log

UX report: C1-C5 accepted (C1 → `d-docking` mock + §8v2; C2 →
affordance law; C3 → chrome clause, IA unchanged; C4 → preflight +
lifecycle; C5 → No-Spoilers full suppression). M1-M8 accepted (fill
ladder, glyph law, rung-2 bound + collapse, verb unification +
"pin" removal + proactive meter, rung-3 promo ban, contrast law, meter
promotion, monument tightening + winner emphasis + 3-digit test).
Minors accepted as §13 items; m9 accepted as the portable live cue.
Modification vs recommendation: M4 asked for one verb on both
platforms; v2 keeps two verbs because the web verb must not promise a
lock screen the platform lacks — each verb tells the truth, "pin" dies
everywhere, and the iOS caption bridges the concepts.

PMM report: 1 accepted (elimination law), 2 accepted (fill ladder +
legend; FULL abbreviation kept with legend), 3-6 accepted (§13),
7 confirmed deliberate (Summer Soccer), 8-11 accepted (§13). Store
sequencing note adopted for the eventual launch material: cream first,
Game 7 second, captioned "Calm most days. Loud when your season is on
the line."

Remaining to validate with eyes (not resolvable on paper): monument
compare speed after gap tightening; 3-digit NBA monument at 390px;
tier-legend comprehension; docking-state copy in situ. All are D1/D2
harness checks.

## 15. Native surfaces — System D on the lock screen and widgets

The shipped native surfaces (Live Activity, Dynamic Island, home-screen
upcoming widget, home-screen live-score widget, lock-screen accessory
widgets) must speak the same grammar. They are already close — the
Stadium Panel tile shipped the "ink = ahead / mute = behind" language —
so this is an alignment pass, not a rebuild. Swift work; requires an
Xcode session; ships in v1.0.2 alongside D1/D2 web surfaces so no user
sees two systems at once.

- **Live Activity (lock screen):** ink chassis stays; type maps to the
  two strands (score = display weights, meta = agate mono); minute
  becomes a stamp; the progress rail gains sport ticks (§10); accent
  obeys the accent law (dot + rail position only). Peak games (the
  elimination law) may carry the accent field treatment on the tile —
  the lock screen version of rung 3. No-Spoilers redaction and
  tap-to-reveal unchanged.
- **Dynamic Island:** compact = dot + score in agate mono; expanded =
  a board row, not a mini-card. Same stamps.
- **Home-screen upcoming widget:** becomes agate rows with kickoff
  stamps and the heavy-rule section head; paging control unchanged.
- **Home-screen live-score widget:** becomes board rows (ink field
  chassis) with minute stamps.
- **Lock-screen accessory widgets:** agate mono, tabular figures.
- **Push notifications:** system-rendered; copy conventions unchanged;
  the kickoff offer's copy adopts the docking verb ("track" not "pin").
- **Widget/LA snapshot contract:** unchanged data shapes
  (`WidgetSnapshot`, `NoNoiseGameAttributes`); this is a SwiftUI
  view-layer restyle only. Backward-compatible with running activities.

## 16. v1.0.2 release plan (post-build)

Context: v1.0 live 2026-06-17; v1.0.1 approved and live (2026-07-02).
v1.0.2 is the System D release. Gate order:

1. D1 + D2 web surfaces built and harness-verified (mobile PWA ships
   first — web users see System D before the store build; acceptable,
   same system).
2. §15 native alignment in Xcode (Swift restyle of the widget
   extension + Live Activity views), verified on device.
3. `npm run ios:sync`, archive, TestFlight pass on a physical phone
   (docking flow §8 tested end to end: track → lock screen → final →
   slot release; permission-denied path).
4. **New App Store screenshots** — shot from the real app in the WC
   preview state via the existing harness at Apple's required sizes.
   Sequencing per the PMM verdict: (1) cream Today (calm sells first),
   (2) NBA Game 7 peak field captioned "Calm most days. Loud when your
   season is on the line.", (3) Watching Live Room + slot meter,
   (4) lock-screen Live Activity, (5) Following with tier stamps.
5. **Metadata refresh:** keep the locked subhead ("Scores, alerts, and
   recaps for what you follow."); What's New copy names the redesign
   calmly ("A sharper front page. Scores you can read from across the
   room. One tap puts a game on your lock screen."); keywords
   unchanged unless PMM flags gaps; version notes go through
   copy-voice.
6. Submit v1.0.2; the existing `docs/APP_STORE_CONTENT.md` checklist
   applies.

## 17. Starting XI (the programme lineups module) — game detail

Requested 2026-07-02. Data verified live against ESPN's summary
endpoint (`site.api.espn.com/.../soccer/fifa.world/summary?event=`):
`rosters[]` carries `formation`, `starter` flags, jersey, name,
position for announced matches, and is empty before announcement —
both states are real and detectable (announced = 11 starters per
side). NBA has the same summary infrastructure (starting five).

**The module (System D native):**
- An agate section on game detail: `STARTING XI` (NBA: `STARTING
  FIVE`). Two columns side by side, one per team — the matchday-
  programme tradition of printed XIs. Column subheads: team code +
  formation ("TUR · 4-2-3-1"), agate mono.
- **Shirt numbers ARE the index numerals** — the system's index device
  becomes the jersey number: `09 GÜLER` rows, GK first, defense →
  attack order, captain marked `(C)`. Number + surname only; positions
  communicate through order, not stamps. Eleven 12-13px mono rows per
  column fit 390px comfortably.
- **The quiet button:** pre-match, once lineups land, the deck area
  gains one quiet agate disclosure row — "Lineups are in →" — that
  scrolls/expands the section. Before announcement the section head
  reads `STARTING XI · USUALLY ~1H BEFORE KICKOFF` (muted, no rows,
  no button). Never an alert, never a badge; discovering it is calm.
- During live/final the section persists below the events field
  (reference material, collapsed by default).
- No-Spoilers: lineups are not spoilers; unaffected.
- Data work: WC game detail gains a summary fetch (the NBA detail
  already uses its summary endpoint); render only what the feed
  returns — empty rosters render the pending state, never placeholder
  names.
- Parked, explicitly not in scope: an "XIs are in" push moment
  (Companion tier candidate; alert-taxonomy change, revisit
  post-System-D).
- Phase: D2 (game detail). Mock: the XI module gets added to `d-game`
  in the QA-fix round.
