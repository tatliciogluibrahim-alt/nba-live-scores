# No Noise Scores Product Changelog

---

## P0/P1 trust and continuity pass — 2026-07-15

App-wide hardening of the two highest-priority UX classes: trust failures
(wrong content, false state, spoiler leaks) and continuity failures (wrong
return paths, repeated asks, lost context).

- **Today is strictly personal.** Hero, live state, Quiet Wrap, recap, and
  World Cup kickoff content now require a matching team, country, series, or
  tournament follow. Unrelated live games and finals no longer leak into the
  personal surface. A visit-level ask latch gives Setup, first-follow tier
  education, and the Brief one shared slot; completing one never reveals a
  second ask underneath it.
- **Navigation preserves intent.** Today, Schedule, and Watching game links
  carry their origin. Game detail names the real source, uses history when it
  exists, and falls back to `/app` on a cold push/widget open. Watching's empty
  and browse actions now lead to the full Schedule. Schedule scope, competition, and
  By day / Bracket / Groups view live in the URL, survive a game-detail round
  trip or cold detail reload, and hydrate safely on a direct query URL.
- **No-Spoilers is sealed end to end.** One shared sport-aware matcher now
  covers team, country, and series follows across Today, Schedule, team,
  country, series, tournament, Watching, widgets, and Live Activities.
  Scores, result language, series dots, champion language, and accessible
  labels respect global or selective hiding. Sport codes cannot cross-match,
  and a hidden series applies only to that exact two-team matchup. Re-enabling
  hiding clears any session reveal, while revealing one game never exposes the
  other results in its series. Standings and advancement structure remain
  visible by the existing L7 doctrine.
- **Push and lock-screen state tell the truth.** Selective hiding now reaches
  web push and APNs; close-game and comeback alerts stay suppressed while a
  matching follow is hidden. Live Activities reconcile to the newest three
  eligible games, clear stale reveal state before a hidden restart, and stop
  claiming overflow games are on the lock screen. Privacy tightening clears a
  stale widget or unredacted Live Activity before network fetches, and legacy
  sync payloads cannot erase newer selective choices. Notification, widget,
  and Live Activity taps route to the correct game in the installed app; offer
  pushes add the game before opening it.
- **Resume paths recover cleanly.** Today rolls over at the local day boundary;
  Schedule refreshes competition phases on time and app resume. Native
  notification permission refreshes after Settings and can recover on resume,
  while an initial denial does not immediately trigger a second ask in the
  same visit. The onboarding sports-ball loader now honors reduced motion.
- Gate: 58 test files / 560 tests, lint and standalone TypeScript clean,
  production web build 93 pages, phone-width interaction and visual QA, and
  native app + widget Xcode build.

---

## Moment Relay + reliance loop — retention & truth loop — 2026-07-15

Two plays from the external product review (ChatGPT), which named
substitution failure — not the dead zone itself — as the core survival
risk, and the missing alert truth loop as the gap in the significance
engine.

- **Fix first (from the same review): start + final are hard tier
  invariants for direct follows.** "Start and final" was an emergent
  outcome of the significance weights; a retune could silently suppress a
  Quiet user's own team's tipoff/final. Now `TIER_INVARIANT_EVENTS`
  always fire for a directly-followed team/country regardless of score.
  The threshold still governs the middle + tournament follows.
- **Moment Relay (retention).** A one-tap "Tell me when NFL is ready" on
  the World Cup wind-down + dead-zone cards. The device arms a reminder
  (`nfl-2026`) — NOT a follow, no alert slot — stored in a KV set across
  web + iOS. A manual admin trigger sends ONE push to every armed device,
  deep-linking into the follow picker, and can never double-fire. This is
  the WC→NFL bridge across the dead zone: silence, then one authorized
  interruption. **Operator runbook — fire it when the NFL build is live:**
  `curl -X POST -H "Authorization: Bearer $CRON_SECRET"
  "https://nonoisescores.app/api/admin/moment-relay?moment=nfl-2026"`
  (add `&force=1` only to retry a failed fan-out).
- **Reliance loop (the truth loop).** After a followed match the user had
  alerts on (last 24h), Today asks once: "Could you rely on the alerts for
  that match? Yes / I missed something / Too many." The anonymous verdict +
  tier + follow-kind append to a KV ledger (`/api/reliance`). This is the
  only proprietary asset available here — labeled evidence about whether
  our interruptions suffice, and whether the significance thresholds are
  calibrated. v1 is feedback-only; the dispatch-side event ledger (alerts
  actually sent, significance bands) is the NFL-scale enrichment, deferred.
  **Metric reframe adopted:** activation = one direct follow + notifications
  enabled, not three follows (three is a pricing allowance, not a value
  milestone). The real reliance test runs at NFL Week 1 with volume; the WC
  final is a small early sample, not proof.
- Gate: lint 0, 467 tests (relay guard, reliance builder + invariant),
  build 93 pages + 3 new dynamic routes. The relay SEND is verifiable only
  post-deploy against real armed devices.

---

## Significance engine — smart notifications — 2026-07-14

The notification is the product (95% of a user's relationship with the app
is a lock-screen ping), so this makes every alert pure signal. Instead of
firing on fixed event types gated by a static tier, the app now scores each
candidate alert 0–100 and treats tiers as significance thresholds. Reuses
the weight philosophy already built for the Brief (rankSignals), the
closeness×lateness heat from live-state, and the calm LLM phraser — wiring
them into the push path for the first time. Spec:
`docs/superpowers/specs/2026-07-14-significance-engine-design.md`.

- **Smart firing (live).** `scoreEvent()` scores every event from stakes
  (round, Game 7, elimination), closeness (margin × clock), and rarity
  (comeback size, milestone). `subscriberWantsEvent` fires when
  `significance + personal boost >= tier threshold` (all:0 / companion:42 /
  quiet:70; a directly-followed team/country adds +25). The effect: a
  genuine classic — a comeback, a close finish, a Game 7, your country's
  goal in the final — **breaks through even to a Quiet follower**, while a
  broad tournament follow gets only finals + classics, and low-stakes events
  are suppressed below Full Details. A direct follow keeps its tier's
  behavior (start + final still reach Quiet). Tier copy retuned to match
  ("Quiet: start, final, and the big moments").
- **Smart copy (turned on 2026-07-14).** `narratePush` phrases the
  notification body in the calm-companion voice, grounded (any invented
  number → rejected → template), 2.5s timeout, pre-narrated once per event,
  spoiler-variant only. **On by default when `ANTHROPIC_API_KEY` is present**
  (goes live on the next deploy if the key is in the prod env); kill with
  `PUSH_NARRATE=0`. Null always falls back to today's templates, so a bad
  generation can never break a push.
- Weights/thresholds are hand-tuned starting dials, to calibrate with real
  delivery data. Gate: lint 0, 455 tests (40+ new across the scorer, the
  gate, the detectors, the grounded guard, and the end-to-end firing path),
  build 93 pages. Verified detect → score → gate for the final's exact path.

---

## Sports-agnostic Schedule + the 100-cap fix — 2026-07-14

Two things: a data bug that was dropping the deepest rounds, and the
Schedule surface going sports-agnostic.

- **Fix: ESPN's 100-event cap was dropping the semis, third place, and
  final.** The schedule route made one range query for the whole
  tournament; ESPN caps a single scoreboard request at 100 events and the
  tournament has 104, so the last four (the semis, third place, final)
  silently never reached the app. This only started biting once ESPN
  published those fixtures (total crossed 100) — right at the climax. It
  also meant the champion could never freeze and third place never
  rendered. Fixed by chunking the window into four sub-ranges under the
  cap and merging (dedup by id, highest status wins). Verified live: all
  104 fixtures present; the semis arrive as real dated fixtures.
- **Schedule is no longer hardcoded to the World Cup.** A Following /
  All-sports scope toggle + a competition switcher sit at the top
  (decisions: switcher not merge; Following default; top of Schedule).
  Backed by a new active-competitions registry
  (`app/companion/schedule/competitions.ts`) that derives status, the
  views each competition can render, and whether you follow it. The World
  Cup keeps its exact By day / Bracket / Groups; other competitions render
  a status card. An idle retention state never leaves a dead end — it
  names what's live now or the next moment and offers one tap to All
  sports. With one competition in scope the switcher hides, so the live
  World Cup is unchanged. Adding NFL (Aug) is registering it + a feed
  adapter; it already renders its coming-soon body ("NFL Season opens
  September 9"). Phases 0–3 of
  `docs/superpowers/specs/2026-07-14-sports-agnostic-architecture-plan.md`;
  Phase 4 (Today/Watching copy sweep) + Phase 5 (NFL live) remain.
- Verified at mobile width (Playwright): Following, All-sports switcher,
  NFL coming-soon — zero console errors. Gate: lint 0, 430 tests (8 new),
  build 93 pages.

---

## Final-week Batch 2 — the ending — 2026-07-13/14

The tournament's close: a persistent, spoiler-gated champion on every
structural surface, a World Cup wind-down moment, a dated dead-zone
card, and small final-week polish. Spec at
docs/superpowers/specs/2026-07-13-wc-final-week-batch2-design.md, plan
at docs/superpowers/plans/2026-07-13-wc-final-week-batch2.md.

- **Champion persistence.** "X are world champions" used to appear only
  on the Today card, only if you followed the winner, and only while the
  final sat in the 14-day live feed (gone ~Jul 23). Now the champion is
  derived once from ESPN's own `winner` flag and frozen write-once to KV
  (`nns:wc:champion:2026`, no expiry, never overwritten). New
  `app/lib/wc-champion.ts` (pure derivation, shared `winnerCodeOf` rule
  the bracket also uses) + server-only `wc-champion-store.ts` (the
  freeze; @vercel/kv stays out of the client bundle). The schedule route
  derives + freezes and exposes `champion`; the live 14-day route reads
  it so Today keeps naming the champion after the final ages out.
- **Champion surfaces, all spoiler-gated.** Naming the winner is the
  ultimate result, so every surface hides it under
  `useEffectiveNoSpoilers(champion.gameId)` — the same reveal the bracket
  score uses. (1) Bracket final slot: the winning side gets a brand star
  and a "Champions" stamp once revealed; unchanged under No-Spoilers.
  (2) Tournament concluded banner: "France are world champions." on
  reveal, generic acknowledgment when hidden (NBA concluded tournaments
  keep the generic banner). (3) Today wind-down moment.
- **WC wind-down moment (a).** `pickClosing` gained a World Cup branch:
  once the champion is frozen and the slate is quiet, it fires
  `tournament:wc-2026` for 7 days (before the dead-zone card), naming the
  champion in the card when revealed. When you follow the winner the
  champion is dropped so your follower champion card names it instead —
  no double naming.
- **Dated dead-zone card (c).** "NFL kicks off in September" → "NFL opens
  September 9." The 2026 opener (Wed Sep 9, Seattle v New England, Super
  Bowl LX rematch) is confirmed/released — verified against Wikipedia +
  FBSchedules, so no fabricated date. One-source constant in
  `app/companion/following/data/nfl-dates.ts`.
- **Quarterfinal rename (d).** Bracket quarter-card heads read
  "Quarterfinal N" (the card culminates in that QF) instead of the
  ambiguous "Quarter N".
- **FT-chip removal in wrap sections (e).** Today's QUIET WRAP and
  Watching's WRAPPED are all-final, so a constant "FT" stamp is noise —
  dropped. A `hideStamp` prop on `TrackedAgateRow` handles the shared
  component; winner emphasis and the gated score are unchanged. Mixed
  lists (country page, bracket tree) keep FT.
- **Watching 24h auto-remove (f).** Finished pins now clear ~24h after
  the match (pure `isExpiredFinalPin` + `WATCHING_FINAL_TTL_MS`, anchored
  on a new `PinnedItem.dateISO`; pruned via `unpinGame` in a guarded
  effect). Destructive by design — chosen over a non-destructive collapse.
  Live/upcoming and undated pins never expire.
- **Not done (g):** the concluded date-anchor (`wcPhase`, fires
  2026-07-20T00:00Z = ~8pm ET Jul 19) still works for this final;
  deriving it from the real final's status is deferred to before the NFL
  build.
- Gate: lint 0, 422 tests (18 new across champion / wind-down / expiry),
  build 85 routes / 93 pages, live-verified against the real ESPN feed
  (champion correctly null pre-final; synthetic decided final derives;
  Batch 1 winner rule intact). Champion surfaces fully verifiable only
  once the real final is played (Jul 19).

---

## Dynamic bracket — winners advance into the next round — 2026-07-12

The knockout bracket was built purely by mapping ESPN's *published*
fixtures onto the fixed tree. ESPN publishes each knockout round only
when it schedules it, so late in the tournament the next round has no
fixture yet — and `resolveSlot` only ever resolved an unplayed slot to
its feeder *pairing* ("MAR/FRA"), never to the actual winner. Live
symptom (2026-07-12): all four quarterfinals were final (FRA, ESP, ENG,
ARG advanced) but the semifinal slots still read "MAR/FRA vs BEL/ESP"
and "ENG/NOR vs SUI/ARG" because ESPN had not yet published the SF
fixtures. The bracket looked frozen.

- **Feeders now advance their winner.** `buildWCBracket` / `resolveSlot`
  read a FINAL feeder's result and put the actual winning country into
  the next slot. The semis now show FRA vs ESP and ENG vs ARG the moment
  the quarterfinals finish, without waiting on ESPN to publish the
  semifinal fixtures. The Final correctly stays TBD until the semis are
  played (no SF fixture to resolve finalists from — never synthesized).
- **Penalty-safe, never guessed.** A new `feederWinnerCode` prefers
  ESPN's own `winner` flag (threaded through `normalizeFixture` +
  `WCScheduleFixture.home/away.winner`), which is penalty-aware — ESPN
  flags the shootout winner even when regulation ended level. It falls
  back to a decisive scoreline, and returns null (keeps the pairing)
  when a match is still level with no flag. The advancing side is trusted
  data, never a fabricated bracket (data-integrity rule).
- This reuses the SAME feeder mapping the tree already trusted for
  pairings, so it introduces no new bracket assumptions — verified: the
  R16→QF tree constants match the real ESPN progression this tournament.
- Tests: 6 new in `wc-bracket-data.test.ts` (winner flag, scoreline
  fallback, never-guess on level, still-pairing while unplayed, followed
  flag) + 1 in `normalize.test.ts`. Suite 406/406, lint clean, build
  93/93 pages. Files: `wc-bracket-data.ts`, `normalize.ts`,
  `schedule/route.ts` (+ tests).

---

## Final-week batch 1 — peer review + audit fixes — 2026-07-11

Pre-semifinal fixes from two sources run the same day: a code audit of
the final-week states and an external LLM product review (prompt at
docs/PEER_REVIEW_BRIEFING.md, findings triaged against the code first —
two of nine were refuted). Plan at
docs/superpowers/plans/2026-07-11-wc-final-week-batch1.md.

- **Notification Center stops archiving stale match states.** The four
  WC lifecycle pushes (kickoff, halftime, second half, full time) now
  share one `${gameId}:wc-state` collapse tag, so each state replaces
  the last on web (SW `tag`) and native (`apns-collapse-id`). Goals
  keep per-scoreline tags and persist — a finished 3–2 match leaves
  three goal cards plus one "Full time", never a halftime stack.
  Delivery dedupe (`dedupeTagFor`) was already separate and is
  untouched. The Live Activity offer rides the same slot, and its copy
  is now "Track this match on your Lock Screen."
- **Third place exists.** "3rd Place" now maps to a real round key
  (`third`) between SF and Final: it renders in BY DAY on its day and
  as a quiet footnote row on the bracket's closing card. It is
  display-only by design — `knockoutResult` skips it, so no
  advancement moment or Brief line fires (nobody advances from the
  bronze match). Never synthesized: absent until ESPN publishes it.
  ESPN loser codes ("SF L1") render as TBD, not jargon.
- **The bracket's final slot shows the result.** SlotCell renders the
  Spoiler-gated score plus LIVE/FT stamp once the match starts,
  mirroring the feeder rows. A played final no longer reads as
  upcoming (peer review P0).
- **Lineup columns match the header.** Starting XI columns now order
  to the game header's away-first presentation via
  `orderLineupTeams` — ESPN's feed order (often home-first) forced a
  mid-page matchup remap (peer review, S10a).
- **Placeholder fixtures stop leaking slot codes.** An undecided
  upper-round fixture ("QFW2 vs QFW1") now reads by its stage
  ("Semifinal · Teams to be decided") on Today's NEXT pointer and the
  home-screen widget — one fix in wcToUpNext covers both.
- **Penalty-decided matches no longer vanish from the bracket.**
  Found in this batch's live verify, worst bug of the day: the
  schedule route preferred ESPN's note headline for `stage`, and on
  penalty-decided matches that headline becomes "Paraguay advance 4-3
  on penalties" — unparseable as a round, so all four PK matches were
  missing from bracket/BY DAY data and their rounds' match numbering
  drifted. Stage is now slug-first (mirrors /api/world-cup); a PK
  semifinal or final next week stays on the tree. Parsing moved to
  `normalize.ts` (route files may only export route fields) with the
  stage contract locked in tests.

Gate: lint 0, 400 tests (baseline 380), build 85 routes, local prod
server verified against the live feed (28/28 knockout stages parse,
key pages 200). Not yet eyeballed in a browser: the SlotCell score
render and third-place row (semis/third not yet published by ESPN —
verify visually once they land).

Six parked items from the peer-feedback round plus the survivors of an
external (Codex) review. Every external claim was verified against the
code first: four of eight were stale or wrong (notification fanout,
spoiler structure, two route claims — all already correct), four were
real and are fixed below.

Parked round:
- **Back means back.** Detail crumbs were hardcoded parent links ("←
  WATCHING" from a game you opened on Today). Now origin-aware: with
  in-app history the crumb reads "← BACK" and uses real history; on a
  cold deep link it falls back to the named parent. New nav-depth
  tracker in the frame.
- **By Day opens on the soonest game.** Upcoming days render first
  (today on top), played days sit beneath a RESULTS marker,
  newest-first. The scroll-to-TODAY anchor (which didn't fire on real
  iOS) is gone — ordering beats scrolling.
- **Row stamps carry the time, not the date.** Under a day head an
  upcoming row now stamps "8:00 PM", not "MON, JUL 6".
- **The view switcher is freeze-paned.** BY DAY · BRACKET · GROUPS
  pins below the brand bar while you scroll (and on the tournament
  bracket page).
- **The tournament page's third tab is now "Schedule"** and links to
  the Schedule tab — the bracket's one home. The game-detail "Bracket
  & schedule" row points there too.

Verified externals:
- **No more silent alert taps.** The four detail preset sections
  (team, country, series, tournament) share FollowCard's guarded
  toggle: at the 3-slot cap the button reads "Full", disables, and
  explains — it used to do nothing.
- **Settings push enrollment carries your alerts.** Subscribing from
  Settings registered the device with an EMPTY alert set, and the
  session's sync effect couldn't see the new subscription until a
  reload. Both fixed: the panel sends current alert follows, and
  subscription state now broadcasts across the app.
- **Series dots respect the guarantee.** Games 1-4 of a best-of-7 no
  longer render as "if necessary" dashes on the tournament strip and
  the series fallback derivation.
- **The tournament picker chip** uses the hand-picked chip ("SOC"),
  not a name slice ("SUM").

Refuted by audit, unchanged: push fanout covers all four follow kinds
(tests prove it), WC match events already collapse to one neutral row
under No-Spoilers, Up Next rows already link to game detail, quiet team
follows already link to /team.

---

## S2 — the bracket becomes a bracket — 2026-07-06

Direction locked by Ibrahim from the S2 mock round: quarter cards.
No identity flags (rejected). Scale step included.

- **Quarter-cards bracket tree.** The BRACKET view (Schedule tab and
  the tournament bracket page) is now a true tree: one card per
  bracket quarter, the two R16 feeders joining into the QF slot with
  a drawn connector, and a closing card joining the semifinals into
  the Final. Played feeders carry their spoiler-gated score; unset
  slots read their feeder pairing ("EGY/ARG · COL/SUI") or TBD. The
  quarter holding a followed country carries a YOUR PATH tag. The
  round-by-round list view retired — BY DAY covers list needs.
- **Nowness = size.** Today's UP NEXT rows step up (15px codes, the
  section is today-only so there's room); the NEXT pointer steps
  down (12px) — a signpost, not a slate entry.
- **Data-integrity catch from verification:** the YOUR PATH tag now
  derives from the matches a card displays, not the pre-tournament
  R32→R16 tree constants — ESPN's real progression drifted from
  those constants, and the stale mapping tagged the wrong quarter.
  Displayed structure is always real fixtures, so this was
  tag-cosmetic only.

---

## S1 — the Schedule tab, Today slimmed, and the honesty batch — 2026-07-06

The IA waterfall's first phase (spec:
docs/superpowers/specs/2026-07-06-schedule-ia-waterfall-design.md).
Four surfaces, four contracts: Today is personal and now, Schedule is
the whole competition in time and structure, Following is setup,
Watching is held.

- **Schedule is the fourth tab.** New `/schedule` route: BY DAY
  (default) is the full tournament chronology — past days keep their
  played matches, the view anchors to TODAY — plus BRACKET (round by
  round) and GROUPS. Complete and impersonal: it never filters to
  follows. Doctrine line under the pagehead when No-Spoilers is on:
  scores stay hidden, the shape of the schedule doesn't.
- **Today is today plus one pointer.** UP NEXT holds today's games
  only (honest count, rows cap at 5 with a "+N more" overflow into
  Schedule). When nothing of yours is on today, a single NEXT row
  points at the soonest followed game. The resting screen folds to
  the same pointer plus "Open Schedule". The "Bracket & schedule"
  foot row retired (the tab replaced it).
- **One app day.** Bracket day heads and date stamps now use the
  device's own timezone, matching Today and the masthead (they were
  US Eastern; a European user saw the same match filed under two
  days). Curated date-only round dates stay UTC-anchored by design.
- **Games no longer vanish at kickoff.** A game whose start passed
  while the feed still says upcoming now stays on the slate reading
  STARTING (Today rows, the lead kicker, and the match detail) for up
  to 45 minutes instead of dropping Today to "All quiet." at the
  exact minute it matters. The home-screen widget excludes these.
- **The bracket stops contradicting itself.** Resolution now also
  derives from published later-round fixtures, so "fills in as the
  groups finish" can't return mid-quarterfinals when ESPN drops
  played R32 games from its feed window.
- **The masthead date can't go stale.** Re-derived on visibility
  changes and a slow tick; it used to freeze at mount across local
  midnight.

Known and accepted per the L7 doctrine: advancement is visible under
No-Spoilers (a team appearing in the next round reveals it won).
Deeper leaks flagged in the 2026-07-06 audit (group-table columns,
country path rail, YouFollow status words) are S2/backlog items.

---

## Friend-feedback batch — glance clarity on the World Cup surfaces — 2026-07-05

Five fixes from the first structured friend-beta thread (Kanade,
2026-07-05). His five complaints were one complaint: the app made him
read sentences to answer glance questions. All fixes are hierarchy,
semantics, and subtraction inside System D — the register is unchanged.

- **UP NEXT now includes the lead.** When the lead Monument is an
  upcoming game, the UP NEXT rule + full-day count sit above it and the
  agate rows continue headerless below — one section, hero = 01, rows =
  02+. The old shape (hero floating above an "UP NEXT · 4 MATCHES" that
  excluded it) read as a contradiction. Live leads keep the old shape:
  a live game isn't "up next."
- **The hero answers "when" in one place.** Upcoming lead kicker reads
  "TODAY 4:00 PM · ROUND OF 16 · FOX" (day-aware via heroKickoffStamp,
  later days read "MON 3:00 PM"). The deck sentence dropped the count
  headline ("Two matches today." duplicated the section count) and now
  carries a stake instead: NBA series stakes as before, and a new
  stage-derived knockout stake for Summer Soccer ("Winner goes through
  to the quarterfinals."). No stake → no sentence.
- **The bracket has front doors.** "Bracket & schedule →" foot row on
  UP NEXT whenever Summer Soccer is on the slate, and the same row in
  the game-detail Summer Soccer section for knockout matches. It was
  three taps deep under Following, a setup surface.
- **Bracket placeholders are legible, BY DAY is the default.** ESPN's
  raw winner codes ("RD16 W6 · RD16 W5") now resolve to the feeder
  pairing ("ENG/MEX · NOR/BRA") via the fixed slot tree; unresolvable
  slots stay "TBD". The BY DAY view (the one the beta reader understood
  without help) is now the default tab; the round tree is one tap away.
- **Prose subtraction.** Upcoming game detail drops "Kicks off today."
  (the kicker already says it; the "Kicking off." imminent state
  stays). "STARTING XI · USUALLY ABOUT..." loses "USUALLY". TrackControl
  subnotes cut to one clause each ("Alerts come from your follows.").
  Bracket intro is one line. The stray semicolon in the pre-resolution
  bracket note is gone.

Parked deliberately: stats tab + player autosuggest search (NFL phase,
he called it "whole another app"), NFL time-window sections (Phase 22).

---

## System D — Color, the un-detachable tab bar, country page, XI subs (mobile) — 2026-07-03

D4a ships the locked color direction and the highest-priority device
fixes. Desktop propagation and consolidation follow as D4b.

- **The C4 palette.** Vermilion brand chrome (masthead rule, live
  count, index numerals, section counts, active tab tick) over cream;
  UP NEXT-class sections sit on sage paper, wrapped sections on blush,
  full-bleed. Sport accents pull back to live signals only. Dark mode
  variants designed for contrast, not auto-flipped.
- **The tab bar can no longer leave the bottom.** iOS 26's WebKit
  detaches fixed bars in the embedded engine (Apple bug, unfixed in
  that path). The app shell now scrolls an inner container and the tab
  bar sits in normal flow beneath it. No fixed element, no bug.
- **Country pages join the system.** Editorial pagehead, matches as
  agate rows with true country-first scores, the qualification cut
  line in the group table, and YOUR PATH as an ink field.
- **Substitutions in the Starting XI.** Subbed-off starters keep their
  row with the minute they left; entrants appear in a quiet SUBS list.
  Lineups refresh during the match so subs land while you watch.
- **Extra time reads correctly.** A 100th-minute match no longer says
  "First half underway." — the phase ladder now knows stoppage, extra
  time, and penalty shootouts. Settings returned to Following's footer.

---

## System D — Following, Tournament, device-feedback wave (mobile) — 2026-07-03

D3 extends the editorial system to Following and the tournament surfaces,
and folds in a wave of touch-ups from real-device screenshots. Mobile
only; desktop md+ stays legacy until D4.

- **Following recomposed.** "Your sports circle." pagehead with honest
  meta ("6 FOLLOWS · 3 OF 3 ALERT SLOTS USED", "Alerts on your first 3
  follows are free."), one ink cross-link band ("N LIVE NOW · OPEN
  WATCHING") when follows are live, and tier-stamped agate rows grouped
  LIVE NOW / UP NEXT / WRAPPED. The stamp fill teaches loudness: OFF
  faint, QUIET outlined, COMPANION filled, FULL heavy. Tapping a row
  opens the same drawer as before (tier picker, per-follow No-Spoilers,
  unfollow). A one-time legend explains the tiers ("QUIET: start and
  final. COMPANION: key moments. FULL DETAILS: everything."),
  dismissible, re-openable from the "?" on the section head.
- **Tournament pages recomposed.** Crumb bar, "Summer Soccer." pagehead
  with data-derived meta, OVERVIEW / GROUPS / BRACKET tabs. YOUR PATH ink
  field for the followed country (stage rail GROUP → FINAL, next-round
  note). Knockout rounds as agate rows ("ALL 16 MATCHES", never "ties").
  Group tables with a dashed qualification cut line and the truthful
  footnote: top 2 go through, the 8 best third-place teams join them.
  No decorative "advancing" dots.
- **Bracket BY DAY.** The bracket page gains a BRACKET | BY DAY toggle:
  the same matches grouped under TODAY / TOMORROW / date heads, for
  "what's on tonight" without reading a tree.
- **Device-feedback fixes.** Spoiler frost now scales with type size (the
  monument numerals were readable through the old fixed blur). The whole
  lead monument on Today is tappable, not just the kicker arrow. Finished
  games moved out of "Tracked for later" into their own WRAPPED section
  on Watching. Today's UP NEXT stamps are day-aware ("SAT 1:00 PM" when a
  game isn't today). The knockout moment, calm endings, quiet-day card,
  and setup strip all speak the System D moment-row grammar (no more
  rounded legacy cards).
- **Ops.** Scan crons write a heartbeat; /api/push/inspect exposes
  lastScanAt so a dead external scheduler is visible in one request.

---

## System D — Game detail, Watching, Docking, Starting XI (mobile) — 2026-07-03

D2 extends the editorial system from Today to the game detail and Watching
surfaces, and ships the one-tap lock-screen docking model (spec §8) plus the
World Cup Starting XI module (spec §17). Mobile only; desktop md+ stays
legacy until D4.

- **One-tap lock screen.** "Pin" is dead as a user-facing word. The game
  detail ends in a single TrackControl: "Track on Lock Screen" on the
  native app (tap adds the game to Watching AND starts the Live Activity
  directly, with a Live Activities permission preflight), "Add to Watching"
  on the web. Four honest states: default, held ("◉ On your lock screen ·
  tap to remove" native, "✓ In Watching · tap to remove" web), full ("Lock
  screen full · N of 3"), and denied ("Turn on Live Activities" guidance).
  A failed native start never fakes success.
- **Slot meter.** Native surfaces show "N OF 3 LOCK SCREEN SLOTS" pips
  above the control and a promoted meter in the Watching Live Room, so the
  3-slot budget is visible before it runs out.
- **Game detail recomposed.** Crumb bar, the Today monument (score pair,
  kicker, progress rail) at the top of both WC and NBA details, a MATCH
  EVENTS ink field for WC (goals newest first, cream GOAL stamps), agate
  GROUP/WATCH sections, then the TrackControl and share row. NBA keeps
  performers, highlights, series and stakes blocks, restyled to agate.
  Under No-Spoilers the events field collapses to one "Hidden · tap to
  reveal" row and the monument numerals frost.
- **Watching recomposed.** "Watching." pagehead, a full-ink Live Room that
  now takes ANY live tracked game (a single live game no longer sits under
  a "Tracked for later" heading), per-row progress rails, TRACKED FOR LATER
  agate for non-live pins, and the footnote "Tracked games leave the lock
  screen at final." on native.
- **Starting XI.** WC game details show the confirmed XI as a two-column
  programme (shirt number, surname, captain mark, formation per side) via
  a new `/api/wc-lineups` route. Before the announcement the section reads
  "Usually about an hour before kickoff"; once lineups land, an upcoming
  match's deck gains a quiet "Lineups are in →" row. NBA STARTING FIVE is
  a recorded follow-up.

Verified by a scripted tap-through (detail → track → Watching → back to
detail) plus the state matrix (default / one-live / No-Spoilers) at 390px.
The harness game + watching routes are state-aware.

---

## System D — Today (mobile) — 2026-07-03

The editorial redesign lands its first phase (D1) on the Today tab, mobile
only. Calm is the baseline, loudness is earned by stakes. Spec:
`docs/superpowers/specs/2026-07-02-system-d-editorial-redesign-design.md`.

- **The front page.** Today reads top to bottom as a broadsheet: masthead
  (mono date, brand chip, live count) over the lead monument, an ink ALSO
  LIVE band for other live games, an agate slate (UP NEXT and QUIET WRAP),
  the follow line, and The Margin footer.
- **The monument.** The single live lead renders as stacked team rows with
  one oversized score pair, a kicker (dot, LIVE, clock, context,
  broadcaster) carrying slate index 01, and a progress rail. At final the
  winner row is full ink and the loser muted.
- **The register ladder.** Resting content sits on cream agate rows. Live
  content moves up to the ink band. A quiet day is allowed to be entirely
  agate with zero accent pixels.
- **Three states.** Quiet day (resting lead plus NEXT UP), fresh install
  (the lead slot becomes a single setup CTA), and No-Spoilers (numerals and
  the deck fact string suppressed, reveal per game and session-scoped).
- **Chrome restyle.** The bottom TabBar moves to the system: cream bar,
  hairline top rule, ink-register icons, 10px mono labels, active tab
  carried by full ink plus label weight (the old pill is gone). Same three
  tabs, same links, same safe-area behavior.
- **Primitives + gallery.** Reusable System D pieces (Masthead, Monument,
  InkField, BoardRow, AgateRow, SecHead, Stamp, Rail, register + emphasis
  logic) with a `/dev/system-preview` gallery for visual QA.

Desktop (md+) is deliberately unchanged until D4. The harness
(`scripts/desktop-shots.mjs`) gained `QA_STATE` seeds
(quiet / fresh / nospoilers, on top of onelive) and a `system` gallery
route so a single run captures every Today state deterministically.

---

## Desktop polish pass — 2026-06-29

A visual-QA-driven polish of the desktop app surface (`/app` at `md+`),
not a redesign. Driven by a reusable Playwright screenshot harness
(`scripts/desktop-shots.mjs`) that seeds a populated WC live-day state and
captures every surface at 390 / 768 / 1280 / 1920, light + dark.

- **Ultrawide width.** Today and Following gain `2xl:max-w-7xl`, so 1920
  screens use the space instead of a fixed `max-w-5xl` column (still
  centered). The calm centered column at smaller desktop widths is
  unchanged.
- **Settings desktop width.** Was stuck at phone-width `max-w-md`; now
  `md:max-w-2xl` so it reads as a desktop settings column.
- **Watching Live Room.** Live games now lay out side by side
  (`md:grid-cols-2 xl:grid-cols-3`) instead of as a tall single-column
  stack.
- **Today You-Follow rail.** Lifted to the top by moving the desktop
  scoreboard into the grid's left column, so the rail aligns with the
  scoreboard instead of starting below it. (Minor: the scoreboard
  eyebrow truncates to "GRO…" in the ~1280-1536 band where the column is
  narrowest; roomy again at 1920.)
- **Keyboard shortcut.** `g t` now routes to `/app`, not `/` (which
  serves the marketing landing on desktop).

Investigated and dismissed (no change made):
- **"1 Issue" error console** — a React hydration-mismatch warning seen
  during dev cold-compile. Confirmed against a production build
  (`npm run build && npm run start`): the in-app error pill does not
  render and no hydration mismatch / page error occurs. Dev-only artifact.
- **Dark-mode sidebar** — not a bug; `--cream` inverts in dark mode and
  the rail uses it.
- **Double chrome on detail pages** — not a bug; `BrandBar` is already
  `md:hidden` and detail routes show the sidebar.

QA harness (`scripts/desktop-shots.mjs`) added as reusable infra; re-run
it and diff after any desktop change. Note: 768 is exactly the `md`
breakpoint (already desktop), so the harness now also shoots 390 for the
true mobile layout.

---

## Lock-screen live-score offer — built + merged to main 2026-06-29 (ships in the next iOS build)

A kickoff push whose tap adds the live score to your lock screen, the calm
version of Google's "tap to add the live score" pattern.

- At a followed game's kickoff/tipoff, eligible iOS users get the **offer
  variant** of the start push (title = matchup, body = "Tap to add the live
  score to your lock screen."). Tapping it pins the game; the existing
  `LiveActivitySync` then starts and maintains the lock-screen tile.
- **No added notification volume.** The offer *replaces* the plain start
  push for eligible iOS recipients (one APNs payload per recipient, chosen
  at fanout). Web push is untouched.
- Gated by a default-on **"Lock screen live scores"** toggle in Settings.
  The preference (`lockScreenOffers`) threads client → register-ios →
  dispatcher, default-on at every read site.
- **Game 7 / WC knockout stakes preserved** in the offer subtitle ("Game 7
  · series on the line", or the knockout round), falling back to "Starting
  now" otherwise.
- Custom tap data rides as top-level APNs keys; a `?offer=live-activity`
  url is the fallback for older iOS without Live Activities.
- No new Swift. Built TDD across 10 commits; per-task + whole-branch review
  clean. Spec/plan in `docs/superpowers/`.
- **Not yet in users' hands:** needs `npm run ios:sync` + a new App Store
  build. On-device checklist (tap from background + cold start, redaction
  on a spoiler-hidden follow, custom-data delivery) lives in the plan's
  Task 9.

---

## Phase 22.5 SHIPPED — iOS app LIVE on the App Store — 2026-06-17 (v1.0), ~2026-06-23 (v1.0.1 in review)

The native iOS app is live. v1.0 went live on the App Store
**2026-06-17**. v1.0.1 (build 15) was submitted ~**2026-06-23** and is
in review (bug fixes + widget refinements).

What's in the shipped app:

- **Capacitor 8 wrapper** around the production PWA
  (`com.nonoisescores.app`, server `https://nonoisescores.app/app`).
- **Live Activity** (lock screen + Dynamic Island) — `LiveActivityPlugin.swift`
  (ActivityKit bridge) + `NoNoiseLiveActivity.swift`. Real-time score
  updates via APNs background push from the scan-nba / scan-wc crons,
  against the **production** APNs endpoint (`LIVE_ACTIVITY_SANDBOX = false`).
  No-Spoilers tap-to-reveal on the tile (iOS 17+).
- **Home-screen widgets** — `WidgetBridgePlugin.swift` writes an App
  Group snapshot; `NoNoiseUpcomingWidget` (upcoming followed games,
  paged) and `NoNoiseLiveScoreWidget` (live followed-game snapshot)
  render it. Personal-follows filter, capped at 5, debounced writes.
- **Lock-screen accessory widgets** (rectangular + inline).
- **Capabilities:** `NSSupportsLiveActivities` +
  `NSSupportsLiveActivitiesFrequentUpdates`, App Group
  `group.com.nonoisescores.app`, `remote-notification` background
  mode, `ITSAppUsesNonExemptEncryption = false`, PrivacyInfo manifest.
- Native code lives in `ios/App/`. Two native targets: `App` and
  `NoNoiseWidgetsExtension`.

DIY end to end with Claude pairing. Total spend: $99/year Apple
Developer Program, no contractor.

> Note to verify when next in Xcode: `App.entitlements` shows
> `aps-environment: development`. Push works in production, so the
> distribution profile is supplying the production value at archive
> time — confirm the release entitlement resolves to `production`.

---

## Phase 22.5-3 LIVE — Live Activity bridge fix, Game Pulse, contrast, copy QA — 2026-05-29

The day Live Activities started working on device, plus a wide pre-ship
hardening sweep. Highlights:

- **Phase 22.5-3: Live Activity working on iPhone.** Confirmed visually
  on lock screen + Dynamic Island for a pinned WC preview game (TUR vs
  USA, 50', 1–1 with leader emphasis). The fix was a Capacitor
  footgun: `getPlugin()` in `app/companion/native/live-activity.ts`
  was `async`, so every caller did `await getPlugin()` and JS Promise
  resolution unwrapped the returned proxy as a thenable. The
  registerPlugin proxy intercepts every property access including
  `.then`, dispatching a phantom `then` native call that hung forever.
  Made `getPlugin()` synchronous (matches the working
  `widget-bridge.ts` pattern) and removed `await` from all three call
  sites. Inline comment locks the rationale so future-me doesn't
  re-async it. **Was the entire P0 blocker. Native plugin and Swift
  scaffolding were correct the whole time.**
- **Live Activity unpin cleanup.** Separate bug: when the user
  unpinned the last live game, `pinned.length` flipped to 0 and the
  `useVisibilityPoll` gate (`pinned.length > 0`) disabled the whole
  poll — which is where the end-loop lived — so the activity for the
  just-unpinned game lingered as a ghost on the lock screen. Added a
  dedicated `useEffect` in `LiveActivitySync` keyed on `pinned` that
  ends any tracked activity whose gameId is no longer pinned,
  independent of the poll.
- **Game Pulse leader emphasis in `ScoreModule`.** The lock-screen
  "pulse" treatment is now consistent across Today, Watching, and
  game detail (since all three already use `ScoreModule`). Leading
  team renders at full `--ink`, trailing team dims to `--mute-1`,
  ties show both bright. Wraps inside `<Spoiler>` so it stays blurred
  when No-Spoilers is on. Establishes the cross-surface visual
  vocabulary: **ink = ahead / won, mute = behind / lost.**
- **Series closure winner color bug fixed.** `CalmEndCard` referenced
  `var(--ink-1)` for the winning team in its per-game dot strip — a
  token that **does not exist anywhere** in globals.css. Winners were
  silently inheriting `--mute-1`, getting only bold weight and no
  color emphasis. Replaced all three occurrences with `var(--ink)`,
  which both repairs the bug and locks the leader/winner language to
  the same `ScoreModule` family.
- **WCAG AA contrast on cream.** `--mute-2` was 2.27:1 on cream (light
  mode), 3.31:1 on warm dark (opt-in dark). Darkened light to
  `#746747` (4.64:1, passes AA) while staying lighter than `--mute-1`
  so the hierarchy holds. Lightened dark to `#8f8366` (~4.7:1).
  `--mute-1` already passed at 5.11:1 (corrected the audit subagent's
  non-gamma luminance math).
- **Privacy + contact footer in Settings.** Calm bottom footer
  (Privacy link, contact email, Instagram) so the privacy policy is
  reachable inside the native wrapper — App Review requirement.
- **Copy + flow QA pass.** 17 em-dashes removed from user-facing copy
  (OG/Twitter alt, Brief email score line, WC calendar ICS, theme
  selector, push panel, test-alert error, "Notifications blocked"
  note, Following empty state, plus 9 aria-labels in Today / Watching
  / MomentSection / CrumbBar / TabBar / DesktopSidebarNav). Three
  remaining "All moments" leaks → "Full Details" (compare/apple,
  nba-playoffs-alerts, changelog). Two metadata titles standardized
  to `Page | No Noise Scores`. Double-period bug fixed on
  EnableNotificationsCard. Sentence fragment fixed in the
  watch-later guide. Softened a "Most sports apps treat
  personalization…" passage away from the banned "most apps get X
  wrong" pattern. Stale tier label fixed on AboutClient.
- **Onboarding → FirstRunStrip overlap fixed.** OnboardingFlow now
  calls `dismissNotifPrompt()` from its alert step ("Turn on alerts"
  *or* "Maybe later"), so Today's FirstRunStrip doesn't re-ask the
  same notification question right after onboarding. Top "Skip"
  still leaves it undecided so the strip correctly nudges skippers.
- **Widget tightened.** `WidgetSync` now filters `payload.upNext` to
  personal games only (followed team / country / series / tournament)
  and caps at 5 (was 3) so the medium widget pages through more.
  Debounced the boot-time snapshot writes (400ms) so the chained
  state hydrations don't fire `WidgetCenter.reloadAllTimelines()` in
  a burst — addresses the user-felt app slowness.
- **Pre-ship verification harness.** `BUILD=LA-v5-unpin-fix` and
  `BUILD=W-v3` tags on the diagnostic logs so a glance at the Xcode
  console says "yes the device is on current code" vs a stale cached
  bundle. New dev endpoint
  `POST /api/push/test-live-activity-update` that forces one
  synthetic ContentState through `pushLiveActivityUpdates`, paired
  with a "Push test update" button on `LiveActivityTester` keyed off
  the first pinned gameId. Lets us verify the score-update push loop
  pre-ship without waiting for real WC games in June 2026.

Still open after this session:

- **App Group container provisioning.** The
  `CFPrefsPlistSource … kCFPreferencesAnyUser … only allowed for
  System Containers` warning persists despite the App Groups
  capability being checked on both targets in Xcode. Code path is
  fully correct (plugin registered, jsName matches, entitlements
  files agree). Resolution is operational: ↻ refresh on App Groups
  in both targets → delete app from device → Clean Build Folder →
  reinstall, which forces the provisioning profile to regenerate
  with the entitlement actually attached.
- **Phase 22.5 pre-ship cleanup.** Held intentionally until App
  Group is verified, since stripping `LiveActivityTester`,
  `WCPreviewToggle`, the BUILD tags, and the diagnostic
  `console.log`s would blind further debugging. Also held: flipping
  `LIVE_ACTIVITY_SANDBOX = true → false` for TestFlight / production
  APNs.
- **Live Activity visual refresh.** The lock-screen tile works but
  feels light on hierarchy. A design pass for three variations is
  out for ideation; one will land in `NoNoiseLiveActivity.swift`
  before submission.

---

## Phase 21 Brief launch + No-Spoilers overhaul + Front Page polish — 2026-05-28

A large session. Highlights:

- **Phase 21 — Brief: SHIPPED.** The previously dark "blocked on
  domain email" infrastructure is now a live product. Resend domain
  verified via Vercel DNS, `RESEND_API_KEY` + `BRIEF_FROM` set,
  daily `send-briefs-cron.yml` GitHub Action (12:30 UTC). Confirmed
  delivering end-to-end. Email redesigned to **"The Margin"**
  (editorial gutter layout, masthead lockup, WC countdown with green
  numeral). Alert labels humanized (`nba-playoffs-2025` → "NBA
  Playoffs"). Entry points added: a Settings "Daily Brief" row + a
  dismissible Today card. Timezone fix: day windowing moved to the US
  Eastern sports day (UTC was dropping evening games from "Today").
  Smarter stakes copy (team-named, round-aware). Logo → hosted PNG
  (Gmail strips inline SVG).
- **No-Spoilers: one reveal per game.** Replaced the per-component
  reveal scatter with a session-scoped `RevealProvider` — one tap
  clears a whole game's surfaces (score, stakes, hero, highlights,
  per-quarter, recap), and the reveal carries Watching → detail.
- **No-Spoilers Pro = selective (repositioned).** Per-follow
  `hideSpoilers` flag + FollowCard toggle + `GameSpoilerScope` so a
  hide-spoilers follow hides its games even with the global toggle
  off. Global toggle stays free forever; selective is the paid pitch.
  AGENTS.md positioning updated.
- **Today Front Page lead.** Direct state headline ("One game
  tonight." / "today"), deck anatomy (time / NBC · Game 6), series
  stake support line, Bricolage 700. Headline counts only today's
  games (was inflating with a future "Game 7 if necessary").
- **Game detail (Watching · Game) realigned** to the design handoff:
  big editorial matchup title, broadcast → pin → footnote bottom
  group, collapsible recap.
- **WC tournament groups** → editorial preview + a dedicated
  `/tournament/[id]/groups` full page (no emoji flags, standings-ready).
- **Sports Circle prototype — explored, shelved.** Two design rounds
  (lists/grids/posters, then seal/sentence/orbit) didn't beat the
  existing typographic share card. Concluded the brand's equity is
  editorial typography, not abstract marks. Revisit post-launch if
  users actually want to share. Not on the critical path.

---

## Phase 22.5-D (first PR) — Desktop Bespoke Lean — 2026-05-27

`/app`, `/following`, and `/watching` are no longer a narrow column
with huge dead margins on a 1440px screen. First lean PR per
`docs/DESKTOP_BESPOKE_PLAN.md`.

- `app/companion/frame/DesktopSidebarNav.tsx` — new. Left rail at
  md+ with brand lockup at the top, Today / Following / Watching as
  primary nav, Settings tucked at the bottom. Hidden below md.
- `app/companion/frame/CompanionFrame.tsx` — accepts a new
  `desktopNav?: "today" | "following" | "watching"` prop. When set,
  renders the rail and offsets the main column right by 220px on
  md+. Detail / content pages omit the prop and keep the mobile-
  shaped layout on desktop (intentional — those screens look fine
  narrow).
- `app/companion/frame/TabBar.tsx` — added `md:hidden`. Bottom nav
  is mobile-only now.
- `app/companion/frame/BrandBar.tsx` — added `md:hidden`. Top brand
  strip is mobile-only; the sidebar carries brand on desktop.
- `app/companion/today/TodayClient.tsx` — main widens to
  `md:max-w-5xl`. North-Star content becomes a 2-column grid on md+
  with `YouFollow` as a sticky right rail (`md:sticky md:top-4`) so
  the user's sports circle is always visible while they scan hero +
  what's next. Mobile order untouched (`YouFollow` still inline).
- `/app`, `/following`, `/watching` page wrappers pass `desktopNav`
  and widen to `md:max-w-3xl` / `md:max-w-5xl` so content fills the
  newly-available space.

Scope intentionally limited. Follow-up PRs will deepen game detail
with a right sidebar (series strip + related games), add live-game
pips to the top header lockup, and 3-column Following at lg+. The
goal of this PR is a recognizable, functional desktop product
without inventing new mental models — same data, same product, just
laid out for the viewport.

---

## Phase 21C-G7 — Game 7 Override Notification — 2026-05-27

Smallest possible retention play. When a followed series reaches its
Game 7, the tipoff push now leans into the moment.

- `app/lib/push/event-detector.ts` — new `isGame7?: boolean` on
  `PushEvent`. Set when the tipoff transition fires AND ESPN's
  `gameContext` label matches `/\bGame\s*7\b/i`. New `gameContext?`
  field on `FreshGameState` carries the label through.
- `app/api/cron/scan-nba/route.ts` — passes `gameContext` from the
  normalized `/api/live-scores` payload into `FreshGameState`. Already
  parsed upstream; just needed wiring through the cron entrypoint.
- `app/lib/push/dispatcher.ts` — `buildPayload` swaps in stakes-aware
  copy when `event.isGame7` is true. Title: `Game 7 · OKC vs MIN`.
  Body: `Series on the line. Tap to follow along.` Same dedupe slot
  as a normal tipoff (`${gameId}:tipoff`), so fires once per series
  maximum.

No tier-filter bypass needed: tipoff is already in every preset
(Quiet / Companion / Close games), so Quiet followers were already
getting the ping. The override is purely about the words.

Rolled out across both web push and APNs through the shared
dispatcher — iOS native users get the Game 7 copy too, on the same
delivery loop.

---

## Phase 22.5-1 + 22.5-2 — iOS Native (APNs) — 2026-05-27

iOS native ship via Capacitor 8. Two parts in one day:

### 22.5-1 (proof of life)

- Capacitor 8 iOS wrapper around the production PWA at
  `nonoisescores.app/app`. Bundle ID `com.nonoisescores.app`.
- `ios/App/App/AppDelegate.swift` extended with the two
  UIApplicationDelegate methods that bridge APNs callbacks into
  Capacitor's NotificationCenter (standard Capacitor 8 install step,
  easy to miss).
- `app/companion/push/CapacitorPushBootstrap.tsx` — invisible
  globally-mounted effect. Detects Capacitor.getPlatform() === "ios",
  requests permission, attaches push lifecycle listeners, calls
  register(), POSTs the resulting APNs token to
  `/api/push/register-ios`.
- `app/lib/push/apns-sender.ts` — JWT-signed APNs sender. Uses `jose`
  for ES256 signing (cached 50min). Uses `undici` with `allowH2: true`
  for HTTP/2 — APNs requires HTTP/2 and Node's native fetch silently
  fails on HTTP/1.1.
- `app/lib/push/ios-token-store.ts` — KV-backed token storage.
- `app/api/push/register-ios/route.ts` — client → server token
  registration endpoint.
- `app/api/admin/test-apns/route.ts` — admin curl-able test endpoint.

Verified end-to-end: a real APNs push lands on a real iPhone lock
screen via `curl /api/admin/test-apns`.

Cost so far: $99 Apple Developer Program. Zero contractor spend.

### 22.5-2 (dispatcher integration)

- Extended `ios-token-store` from a flat set to per-token records
  carrying `alerts` + `noSpoilers` (same shape as web push subs).
  Backward compatible with v1 proof-of-life tokens.
- Extended `/api/push/register-ios` to accept the sync payload.
- `CapacitorPushBootstrap` now sends follows + noSpoilers and
  re-syncs when they change (mirrors PushSyncEffect's hash-based
  dedupe).
- Dispatcher refactored: matcher logic extracted as
  `subscriberWantsEvent` over a shared `SubscriberPreferences` type.
  Web push and APNs share the four-kind follow matrix (team /
  country / series / tournament), the per-follow tier filter
  (Quiet / Standard / Close games), and No-Spoilers gating. Only
  the transport differs.
- Per-transport dedupe namespaces (`apns:<token-prefix>` vs raw
  endpoint URL) so a user with both an iOS install and a web PWA
  install gets both pings without dedupe collision.
- 5 new ops-metrics counters for the APNs path so the admin
  dashboard can compare delivery health by transport.

Result: a user who installs the iOS native build and grants
notifications now gets game events delivered via APNs through the
same dispatcher pipeline that has been driving web push.

### Side-quest fixes shipped same day

- **FirstRunStrip step 3 label fix.** Title was "Pick what gets
  alerts" but the underlying gate was push-permission-decision
  (notifPromptDismissed). Renamed to "Turn on notifications" so the
  title matches what flips the gate.
- **PWA install prompts hidden on Capacitor native.** Added
  `isCapacitorNative()` detector in `app/companion/dev/native-detect.ts`.
  InstallPromptCard bails when running inside the wrapper.
- **All page titles normalized.** 13 page metadata strings still
  used em-dashes ("Watching — No Noise Scores"). Normalized to the
  canonical "Page | No Noise Scores" per the May 2026 Copy + Tone
  sweep.

### Strategic notes captured

- **Logo feels too dark** — user wants more cream-leaning BrandMark.
  Hold for a focused aesthetic session with side-by-side variants.
- **Desktop bespoke** — once iOS native settles, redesign the
  desktop landing for the workday-checking-scores audience. SEO +
  organic-discovery angle. Phase 23+ candidate.
- **Visual QA pass** — code audits caught the title inconsistency
  but won't catch visual regressions. Phase 22.5-final candidate.

---

## Phase 21B-2 Calendar export — REVERTED 2026-05-27

The Add to Calendar feature shipped in Phase 21B-2 was removed less
than 24 hours after it landed. Reasons:

- Visual jank. The `📅` emoji + chip pattern didn't fit the cream
  chassis — looked like a SaaS feature dropped into an editorial UI.
- Unclear value prop. No signal that anyone would actually use it.
  PWA users open the app to check scores; the calendar handoff
  duplicated the "remember the game is on" job that follow-alerts
  already do.
- Adding a feature is cheap. Maintaining one that nobody uses is
  expensive. Cleaner to delete now than to keep it lingering as
  background visual debt.

Files deleted: `app/lib/calendar/ics.ts`,
`app/companion/calendar/AddToCalendarButton.tsx`. Removed from
`NBALiveCompanion.tsx` and `WCGameDetail.tsx`.

The historical Phase 21B-2 entry below is kept for record. The
feature shipped, then got removed.

---

## Phase 21B — Calm Endings + Calendar — 2026-05-26 (late)

Three small features shipped after the post-launch ideation pass. All
three honor the wedge by extending existing primitives rather than
adding new mental models. None required new infrastructure.

### 1. CalmEndCard — Series Closure + Tournament Wind-Down

A single new Today component that surfaces an "honest ending" when one
arrives. Two configurations, one component:

- **Series Closure.** When a playoff series the user follows wraps
  (either via a series follow or a team follow), Today gets a calm
  card the morning after. Eyebrow `Series wrapped`. Headline = the
  matchup chip. Detail = "[N] games. [Next round name] is next."
  Per-game dot strip with winner attribution gated on No-Spoilers.
  Optional CTA "Follow [winner]" when the user doesn't already
  follow the advancing team.
- **Tournament Wind-Down.** When the NBA Finals wrap within the last
  7 days AND the slate is otherwise quiet (no live, no upcoming),
  Today surfaces a single acknowledgment card: "The playoffs are
  over. We'll be back when the next moment matters." No CTA, no
  upsell. The brand-defining moment.

Series takes priority. Only one closing moment renders at a time.
Dismissal is client-side (localStorage, keyed by stable moment id).
Once dismissed, the card never re-renders for that moment. New
series and new seasons get fresh ids.

Files:

- `app/companion/today/today-data.ts` — added `ClosingMoment` type,
  `pickClosing()` function, `closing` field on `TodayPayload`.
- `app/companion/today/sections/calm-end-card.tsx` — new component.
- `app/companion/today/sections/use-closing-dismissed.ts` — dismissal
  hook with localStorage backing (cap 50 entries).
- `app/companion/today/TodayClient.tsx` — wired between Brief and
  install/notifications cards.
- `app/companion/today/use-today-data.ts` — EMPTY payload updated.

### 2. Add to Calendar

A spoiler-safe iCal (.ics) export button on every upcoming game
detail page (NBA + WC). One tap downloads a calendar file the user
imports into Apple Calendar, Google Calendar, or Outlook.

Spoiler-safety: under No-Spoilers, the calendar SUMMARY reads
"<followed team> game" instead of the matchup. If we don't know who
the user follows in this game, the fallback is generic ("NBA game",
"World Cup game"). The DESCRIPTION never includes scores or
matchup-revealing context, even when No-Spoilers is off — calendar
text leaks into Spotlight, Siri summaries, and lock-screen reminders
that we don't fully control.

Files:

- `app/lib/calendar/ics.ts` — pure iCal generator with RFC 5545
  escaping and per-sport duration (NBA 2h30m, WC 2h).
- `app/companion/calendar/AddToCalendarButton.tsx` — single-tap
  download button. Transient "Added" confirmation for 2s.
- `app/companion/game/NBALiveCompanion.tsx` — wired below pin
  controls, upcoming-only.
- `app/companion/game/WCGameDetail.tsx` — same.

### 3. Tier rename + leaders wire-through

Two more small ships after a follow-up review of the alert tiers and
the live-game highlights surface.

**Alert tier rename.** The third tier ("All moments") was misleading
users into thinking it produced a different volume than Companion.
The actual matrix only adds close-game and comeback events, both of
which fire rarely. Renamed for honesty:

- Quiet → Quiet (unchanged)
- Companion → **Standard** ("Start, quarter breaks, final.")
- All moments → **Close games** ("Adds close finishes and comebacks.")

Internal storage keys (`quiet | companion | all`) stay unchanged so
existing follows keep their tier without migration. Files touched:
`app/companion/state/types.ts` (PRESETS labels),
`app/lib/brief/compose-brief.ts` (Brief alert summary),
`app/companion/today/EnableNotificationsCard.tsx` (dev comment),
`app/lib/push/dispatcher.ts` (dev comment).

**Live-game highlights upgrade.** The HighlightsStack had a player-
detection system that wasn't firing during live games because
`game.leaders` was stale (from the scoreboard endpoint, which lags
mid-game). Wired the fresher `leaders` field from
`/api/nba-game-detail` through `useNBADetail` into a merged
`gameWithFreshLeaders` object in `NBALiveCompanion`. Now mid-game
highlights surface "SGA · 30 PTS, 6 AST" or "30-point night"
instead of falling back to team-stat lines.

**Retroactive scope.** The fix is "live retroactive" — any past
game the user opens re-fetches detail from ESPN's summary endpoint,
gets fresh leaders, and the Recap Card derivation upgrades
automatically. Inside ESPN's retention window (multiple weeks,
covering the playoff bracket), this works cleanly without rewriting
snapshots.

Files: `app/companion/game/use-nba-detail.ts` (added `leaders` to
`NBADetail`), `app/companion/game/NBALiveCompanion.tsx` (merge +
passthrough).

### 4. Push fix (committed earlier this evening)

The PushSyncEffect was persisting the "synced" hash *before* the
POST resolved, so iOS PWA suspensions silently dropped follow-sync
requests. Fixed: hash now persists only on HTTP 2xx, with a
localStorage backing instead of an in-memory ref. Also fixed the
related end-of-quarter detection so halftime alerts fire when Q2
ends, not when Q3 starts.

Files: `app/companion/push/PushSyncEffect.tsx`,
`app/companion/push/use-push-subscription.ts`,
`app/lib/push/event-detector.ts`,
`app/lib/push/state-cache.ts`,
`app/api/cron/scan-nba/route.ts`.

### Ideation + strategy context

This batch was the "obvious next ship" subset of an LLM-driven
ideation pass (`docs/IDEATION_BRIEFING.md`). The remaining ideas are
sorted into Ship / Hold / Skip / Reconsider in `docs/ROADMAP.md`
under the Phase 21B section. None violate the wedge.

Two additional strategic discussions landed during the same session
and are captured in new files for future-you to reference:

- **`docs/RETENTION_PLAYBOOK.md`** — A retention-specialist
  ideation pass produced eight high-leverage plays sorted by
  impact. The top three (Push permission recovery, Series Closure
  follow suggestion, Game 7 override notification) are the
  recommended Phase 21C starting points. One proposal — strict
  activation-threshold gating — was deliberately softened to
  instrumentation-only (prescriptive gating risks confused exits
  more than it activates).
- **`docs/IOS_NATIVE_PLAN.md`** — Honest budget and sequencing for
  shipping iOS native via Capacitor. Bottom line: ~$2,500 one-time
  + $99/year (Apple Dev Program) with a contractor for the native
  Swift layer (Capacitor shell + APNs + Live Activity + widget).
  The June-August window between WC kickoff and NFL season is the
  natural slot. Live Activity for pinned games is the single
  feature most likely to differentiate this product from ESPN on
  iOS, and shipping it before the marketing phase strengthens the
  Show HN pitch substantially.

Neither commits the project to a specific direction. Both exist so
the next strategic conversation starts from captured context, not
from rederivation.

---

## Polish Batch + Copy/Tone Sweep — 2026-05-26

After the post-9-20 QA fixes, two more sweeps landed before friend
beta:

### Polish batch (10 items from the "what else can we do" list)

1. **Dynamic OG + Twitter share images.** New `app/opengraph-image.tsx`
   + `app/twitter-image.tsx`. Cream chassis, BrandMark glyph,
   editorial headline. Statically prerendered at build (Node runtime,
   not Edge, to avoid Vercel's 1 MB Hobby-tier Edge bundle limit).
2. **Favicon for dark browser chrome.** Rewrote `public/favicon.svg`
   to include the dark ink chip backing. Was just a dark pill before
   (invisible on dark tabs).
3. **Apple touch icon** verified — the BrandMark glyph self-provides
   its dark backdrop so it reads on any wallpaper.
4. **Loading-shell consistency audit.** Clean across detail pages.
5. **LCP audit.** Local dev FCP 92ms, transfer size 94KB. Wrote
   `docs/PERFORMANCE.md` with baselines + Core Web Vitals targets +
   monitoring plan.
6. **Server-side game scrollback** confirmed already shipped (60-day
   snapshot TTL exceeds 30-day target).
7. **Beta signup + feedback infrastructure.** New
   `app/lib/beta/subscriber-store.ts` (KV-backed). New API routes
   `/api/beta/signup` + `/api/beta/feedback`. New `BetaSignupForm`
   on `/beta`. New `BetaFeedbackForm` on `/beta/feedback` (noindex)
   with structured fields: working / broken / missing / vibe.
   Extended `request-guards.ts` with new rate-limit kinds.
8. **Tournament page polish.** Added inline `MiniSeriesStrip` under
   each NBA playoff series row on /tournament/nba-playoffs-2026.
   7-dot strip, spoiler-safe (filled vs. dashed; no winner attribution
   per dot).
10. **Lockscreen mock No-Spoilers variant.** Each preset preview card
    in `NotificationPreview` now shows both the regular alert AND the
    NS variant. Suppressed alerts (close-game under NS) render as a
    flat callout.
17. **SEO submission guide.** `docs/SEO_SUBMISSION.md` with step-by-
    step for Google Search Console + Bing + IndexNow + AI search.

### Copy + tone sweep

After the polish batch, a full voice pass across every user-facing
surface:

- **Em-dashes removed** from all user-facing copy. 160 instances
  across 14 content files. Replaced with periods, commas, or
  parentheses depending on context. Code comments keep em-dashes.
- **AI-marketing flourishes neutralized.** "Three things every other
  sports app gets wrong" → "Three things this app does on purpose."
  "Four concepts. That's the whole product." → "Four ideas. That's
  the app." "Plain answers." → "Common questions."
- **HowItWorksCapsule bodies rewritten** for clarity. Each tile now
  reads action-first, outcome-clear.
- **NFL Sundays language corrected.** The moments band previously
  said "we don't cover regular-season filler" — incorrect because NFL
  is a Sunday-anchored regular season. Reframed as "The events that
  pull you to the screen. NBA Playoffs, the World Cup, NFL Sundays."
- **Moments band status pills** removed for NBA and WC. Kept for NFL
  "Coming Aug 2026." Made `status` optional in `MomentEntry` type.
- **Metadata titles** standardized to `Page | No Noise Scores`. The
  three pages with broken sentence-fragment titles after the em-dash
  sweep were rewritten.
- **Contact info added** to the landing footer, /about, /beta,
  /privacy: Instagram @nonoisescores +
  nonoisescores@gmail.com.

### 3-free-alerts pricing model in copy

Surfaced honestly:

- FAQ "Is it free?" answer rewritten to explain: free for most
  people, alerts on first 3 follows on the house, paid tier later
  for unlimited (helps cover the notification backend cost).
- In-app: when alert slots are full, message now reads "Alert slots
  are full (3 of 3 on the free plan). Turn one off to enable this.
  Unlimited alerts will land in a paid tier later." Same in
  PerFollowAlerts and FollowCard.

### Brand identity additions

- Hero on the desktop landing now includes the BrandMark glyph + "No
  Noise Scores" wordmark lockup at the top of the left column.
- Phone preview mockup on the landing now shows the bottom tab bar
  (Today active, Following, Watching) with the same icons as the
  real app. Makes the 3-tab IA visible in 5 seconds.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓
- `/opengraph-image` and `/twitter-image` are statically prerendered
  (no edge bundle issues, no runtime cost).

---

## Post-9-20 QA Fixes — Series Data, Light Default, BrandMark, Lock-Screen Mock — 2026-05-26

Five bugs caught in user QA after the Phase 9–20 mega-push. Build + lint
+ typecheck clean. All fixes are surgical — no structural changes.

### NYK vs CLE series — alias + status bug

The series detail page was reading "Cleveland won 4-0" (wrong winner)
and "Series in progress" (wrong status) for the wrapped Knicks/Cavaliers
conf finals. Both bugs traced back to ESPN sending `seriesSummary`
as "NY WINS SERIES 4-0" while the team abbreviation is canonicalised
to "NYK".

- `app/api/live-scores/route.ts` — `normalizeSeriesSummary` now
  canonicalises team codes inside the summary string itself (NY → NYK),
  matching what `canonicalAbbreviation` already does for team objects.
  Every downstream consumer (parsers, recap headlines, share copy)
  sees one consistent code.
- `app/nba/lib/series.ts` — `parseSeriesWins` is now defensively
  alias-aware. Adds a small `SUMMARY_ALIASES` map and a
  `teamMatches(parsed, abbr)` helper so the parser correctly
  attributes wins even if some caller passes through an
  un-canonicalised string. Previously the `(winner.includes(abbrB))`
  short-circuit was falsely assigning the higher win count to the
  losing team when one code was a substring of another.
- `app/companion/series/series-data.ts` — `buildSafeStake` now returns
  "Series wrapped." when `series.status === "complete"`. Previously
  fell through to "Series in progress." which contradicted the "Final"
  pill and the "NYK won 4-0" spoilery line. Verified: /series/CLE-NYK
  now reads "Series wrapped." + "NYK WINS SERIES 4-0" + "NYK won the
  series 4–0." with the seven-dot strip showing four filled NYK dots.

### Light mode is the default; dark mode is opt-in only

The Phase 19 auto-detect via `@media (prefers-color-scheme: dark)`
flipped the cream chassis on every system-dark phone — losing the
brand identity on first install.

- `app/globals.css` — removed the `@media (prefers-color-scheme: dark)`
  block entirely. Dark mode now fires only when the user sets
  `<html data-theme="dark">` via the ThemeSelector.
- `app/layout.tsx` — viewport `themeColor` is now a single cream value
  (`#f1ead8`) instead of a per-scheme array. `colorScheme: "light"`
  (was `"light dark"`).
- `app/companion/settings/ThemeSelector.tsx` — collapsed from three
  options (System / Light / Dark) to two (Light / Dark). "System" is
  gone because the OS preference no longer drives the chassis.

### BrandMark identity stayed inverted in dark mode

The `BrandMark` SVG used `var(--ink)` for the chip + `var(--cream)`
for the scoreboard pill. In dark mode those tokens invert — the chip
became cream and the pill became dark, creating the "lighter border"
effect the user reported on the logo.

- `app/companion/frame/BrandMark.tsx` — uses *literal* color values
  (`#1a1612`, `#f1ead8`, `#b85a2a`) for chip, pill, and live pip.
  Brand identity is now constant across both themes.

### Lock-screen notification mockup was inverted in dark mode

The `LockScreenPushMock` in `NotificationPreview` used `--ink` + `--cream`
tokens for the dark notification tile. Same inversion problem as the
BrandMark — in dark mode the mockup rendered as a cream tile with
poor-contrast cream text.

- `app/companion/settings/NotificationPreview.tsx` — `LockScreenPushMock`
  uses literal colors (`#2b2520`, `#f1ead8`) so the mockup always reads
  as an iOS lock-screen push, regardless of the app's theme.

### BrandBar / CrumbBar hardcoded cream backdrop in dark mode

Found during the same QA. Both sticky-nav components used
`rgba(241, 234, 216, 0.85)` directly, which didn't flip with the theme
and punched a cream-light hole through dark pages.

- `app/globals.css` — new `--bar-blur-bg` token (cream in light, warm-
  dark in dark).
- `app/companion/frame/BrandBar.tsx` + `CrumbBar.tsx` — both swapped
  to `var(--bar-blur-bg)`.

### Smaller copy improvements alongside

- `app/lib/brief/compose-brief.ts` — `worthKnowing` regex tightened:
  was capturing the first `(\w+)` of the summary, which would emit
  "SERIES can sweep..." for a "SERIES TIED 3-3" line. Now matches the
  proper `LEADS SERIES n-m` pattern and only emits attributed lines.
- Added Game-7 elimination clause + close-it phrasing to match the
  stake deriver.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓

### What's NOT in this fix

- The Phase 19 theme bootstrap script in `app/layout.tsx` doesn't
  execute in Next 16 + Turbopack *dev* mode (a React 19 caution).
  Production builds inject it correctly into static HTML, so the
  flash-prevention works in production. In dev the user can still
  click Dark in Alerts & Notifications to toggle live.

---

## Phases 9–20 — Friend Beta Gate, Desktop Landing, SEO, Content, Polish — 2026-05-26

The biggest single push to date. Turns the app from a mobile-only PWA
into a real two-products-on-one-domain product:

1. The mobile app (Today / Following / Watching) — calm, narrow.
2. The desktop landing + content library — marketing, SEO, AI-search
   ready.

41 routes total after this push. 21 brand-new pages. Build + lint +
typecheck clean throughout.

### Phase 9 — Friend Beta Gate

- New `app/companion/today/InstallPromptCard.tsx` — dismissible
  "Add to your home screen" card on Today. Android Chrome:
  `beforeinstallprompt` one-tap install. iOS Safari: expandable
  Share → Add to Home Screen instructions chip.
- Settings page renamed across the codebase: **"Watch + Alerts"
  → "Alerts & Notifications"** (kills the collision with /watching).
- `installPromptDismissed` added to `UserPrefs` + storage parser +
  provider context.
- No-Spoilers leak audit: confirmed push dispatcher body strings,
  static page metadata, and Spoiler primitives are end-to-end safe.
- `FirstRunStrip` Follow-vs-Pin distinction reinforced.

### Phase 10 — Web Route Architecture Split

- `app/page.tsx` is now responsive-aware: mobile UA → renders
  `TodayClient` (current app); desktop UA → renders `LandingShell`.
  UA sniffing via `headers().get("user-agent")` at the server
  boundary.
- New `app/app/page.tsx` — canonical "open the app on any device"
  route. Desktop landing CTAs point here. Direct deep-link target.
- Mobile nav unchanged. PWA installs still resolve to `/` correctly.

### Phase 11 — Desktop Landing Shell

New `app/companion/landing/` directory with six on-brand components:

- `LandingHero.tsx` — left product story (locked positioning copy,
  install / beta CTAs), right phone-sized live preview snapshot
  (static visual; doesn't depend on client hydration).
- `HowItWorksCapsule.tsx` — four-step capsule (Follow / Alert / Pin
  / No-Spoilers). Plus shared `SectionHeader` primitive.
- `MomentsBand.tsx` — NBA Playoffs, FIFA World Cup 2026, NFL (coming
  Aug 2026) as three accent-railed moment cards.
- `DifferentiatorPillars.tsx` — "Calm by default," "Personalized,
  not algorithmic," "Hide-by-default when you want."
- `LandingFAQ.tsx` — six questions with expand-on-tap rows. Q&A
  data lives in `faq-data.ts` so both the client component and
  the server-side JSON-LD payload can import it.
- `LandingFooter.tsx` — quiet library of links to every content
  page, organized into Features / Guides / Compare / Product.

### Phase 12 — SEO Foundation

- New `app/robots.ts` — explicit allow-list for Googlebot, Bingbot,
  OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot. Disallowed
  GPTBot / anthropic-ai / CCBot training crawlers. Disallowed
  user-state routes (`/watching`, `/following/*`, `/brief/*`,
  `/app`, `/api/*`).
- New `app/sitemap.ts` — 17 public routes with priorities.
- JSON-LD on landing: Organization + WebApplication + FAQPage
  emitted as a single graph for AI-search citation lift.
- `<noindex>` added to stateful route metadata: `/watching`,
  `/following/*`, `/brief/subscribe`, `/brief/preview`, `/settings`,
  `/settings/about`.

### Phase 13 — Core Content Pages

New `ContentPageShell` (in `app/companion/landing/`) with shared
chrome and primitives (`H2`, `H3`, `P`, `Quote`, `CalloutBox`,
`BulletList`, `CompareTable`). Pages:

- `/about` — what is this, who builds it, the philosophy.
- `/privacy` — plain-English data list. What we collect, what we
  don't, why.
- `/changelog` — public-facing editorial summary.
- `/beta` — friend beta sign-up landing (DM-driven for now;
  form lands later).

### Phase 14 — Feature Pages (the "Manifesto" Set)

- `/how-it-works` — the master manifesto page (Follow → Alert →
  Pin → No-Spoilers as one story).
- `/features/no-spoilers` — what gets hidden, what stays visible,
  the contract end-to-end.
- `/features/sports-circle` — the three nouns (Follow / Alert /
  Pin) framed as one personalization system.
- `/features/quiet-sports-alerts` — three tiers, quiet hours,
  spoiler-safe previews.

### Phase 15 — Guide Pages

- `/guides/how-to-add-to-iphone-home-screen` — screenshot-led
  walkthrough.
- `/guides/follow-vs-pin` — concept distinction with comparison
  table.
- `/guides/watch-games-later-without-spoilers` — practical
  spoiler-safe workflow.

### Phase 16 — Comparison + Niche Capture

- `/compare/apple-sports-alternative` — honest table where each
  app wins.
- `/compare/espn-app-alternative` — honest table; calmer-alternative
  framing.
- `/nba-playoffs-alerts` — intent capture for playoff months.
- `/world-cup-2026-app` — intent capture for pre-tournament window.

### Phase 17 — Following = Sports Circle

- H1 reframed: "Following." → **"Your sports circle."**
- Empty-state H1: "Tell us who you follow." → **"Build your sports
  circle."**
- Summary subtitle pivots to count-based copy when follows exist,
  invitation copy when empty.

### Phase 18 — Watching Deepening

- WatchingEmpty H1: "Nothing pinned yet." → **"Your live cockpit."**
  Body reinforces "Pin = one game tonight; Follow = whole season."
- `WatchingDashboard` switches from `space-y-2` to a 2-up grid at
  md+ widths when 2+ pins exist. Single-pin layout stays
  single-column.

### Phase 19 — Dark Mode (warm dark)

- New token block in `app/globals.css` for warm dark (background
  `#1d1812`, paper `#251f17`, ink-on-dark `#f1ead8`). Sport
  accents shift slightly for dark readability (NBA `#f47743`,
  WC `#3d9d5d`, NFL `#4a78c4`, live `#f47743`).
- Auto-detects via `@media (prefers-color-scheme: dark)` unless
  the user has manually overridden.
- New `app/companion/settings/ThemeSelector.tsx` — three-option pill
  row in Alerts & Notifications: System / Light / Dark. Writes to
  `localStorage` under `no-noise-theme` and sets `data-theme` on
  `<html>`.
- Inline `<script>` in `app/layout.tsx` reads the stored choice
  before paint to avoid the flash.
- iOS theme-color now responds per color scheme (cream when light,
  warm dark when dark).

### Phase 20 — Retention Plumbing

- New `TestPushRow` inside the expanded per-follow alert row. Sends
  a local SW notification via `serviceWorker.ready.showNotification`
  with body "If you see this, alerts work for [followName]."
- Lets users verify their device receives alerts without waiting
  for a real game.
- Custom "Q4 with margin < 6" tier deferred to a focused future
  session (requires dispatcher schema work).

### What's NOT in Phases 9–20

- Brief send pipeline (still gated on domain email setup — Phase 21).
- NFL build (Phase 22).
- Custom alert tier additions ("Q4 with margin < 6" — needs
  dispatcher schema work).
- Multi-device push relay.
- Per-follow targeted test push (the current Phase 20 test-row
  fires a generic local notification; per-follow event simulation
  would require dispatcher schema work).

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 41 routes (21 new content pages + landing
  + app + sitemap.xml + robots.txt + existing app routes).

---

## Phases A / B / C — Feature Expansion Set — 2026-05-26

Three editorial features that take the product from "calm scoreboard"
to "calm sports companion." Stakes, Quiet Recap, and the Brief email
infrastructure all land here. Build + lint + typecheck clean.

### Phase A — Explain the Stakes

Plain-English stake derivation. Rules-based, no probabilities, no
predictions — just editorial context for "why this game/series/group
matters."

- New `app/companion/stakes/derive-stakes.ts` — `deriveNBASeriesStake`
  parses `seriesSummary` for WINS/LEADS/TIED patterns; emits lines like
  "NY can close the series with one more win." / "Game 7. Winner takes
  the series." `deriveWCGroupStake` returns the pre-tournament
  structural line or null (defers to the standings feed once it lands).
- New `app/companion/stakes/StakesLine.tsx` — Eyebrow + sentence as
  inline body copy under the relevant section header. Spoiler-wrapped
  when the stake is state-revealing.
- Mounted on `NBALiveCompanion` (under Series block) and `CountryClient`
  (under PathTimeline).

### Phase B — Quiet Recap Card

Premium in-app final-game artifact. Replaces the live HeroMoment +
HighlightsStack treatment on finals.

- New `app/companion/recap/derive-recap.ts` — composes the `NBARecap`
  shape (headline, score, series state, up to 3 "what mattered" bullets,
  optional next-game line). Bullet derivation covers triple-doubles /
  double-doubles / 30-/40-point nights, rebound dominance, hot-or-cold
  three-point shooting, OT / comeback / Q4 push / margin stories.
- New `app/companion/recap/QuietRecapCard.tsx` — paper chassis, 3px NBA
  accent rail, Eyebrow "Recap," Display headline ("Knicks took it."),
  tabular score line, series state, bullet list, optional "Next" block.
  Every spoilery cell Spoiler-wrapped under No-Spoilers.
- `NBALiveCompanion` skips HeroMoment + HighlightsStack on finals when
  recap composes; falls back to slim HeroMoment "Final." when boxscore
  is delayed (recap null-fallback).
- `deriveNBARecap` accepts `allNBAGames` and emits a "Next" line
  ("Game 5 · in NY · Wed 8:00 PM.") when the series isn't wrapped.

### Phase C — No Noise Brief (email infrastructure)

Personalized morning recap of yesterday's games for follows. Code
complete; send pipeline gated on domain email setup (DNS / Resend
domain auth not yet configured).

- New `app/lib/brief/subscriber-store.ts` — KV-backed subscriber model,
  SHA-256 hashed email keys, opaque unsubscribe tokens.
- New `app/lib/brief/compose-brief.ts` — pure composer; per-user
  follow-match filtering against NBA games (team / series / tournament
  kinds); reuses `deriveNBARecap` for blurbs; `shouldSendBrief` skips
  empty days.
- New `app/lib/brief/render-email.ts` — HTML email renderer with inline
  styles (Gmail / Apple Mail safe) plus plain-text fallback.
- New `app/lib/brief/send-email.ts` — Resend HTTP API wrapper, no SDK.
  Reads `RESEND_API_KEY` + `BRIEF_FROM` env vars.
- New API routes: `/api/brief/subscribe`, `/api/brief/unsubscribe`,
  `/api/cron/send-briefs`. Rate-limited via the existing
  `request-guards.ts` (new `"brief-subscribe"` kind, 5/min/IP).
- New pages: `/brief/subscribe`, `/brief/preview`, `/brief/unsubscribed`.
  No entry point in nav by design — Brief stays dark until email is
  sorted (Phase 21).

### Closures alongside the feature set

- WC navigation: country detail page reads `?from=` searchParam; back
  target is contextual (`from=fifa-world-cup-2026` routes back to the
  tournament page).
- Tournament detail page (Phase 49) and Team detail page (Phase 50)
  shipped, closing the Phase 1 fallback routes.
- NFL data scaffolding (Phase 45) + design doc (Phase 46). Full build
  queued for Phase 22 (August 2026).
- Path B follow-schema design doc lives in `docs/follow-moments-design.md`
  for when a 3rd moment-tournament triggers the refactor.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 21 static pages + 3 new API routes
  (`/api/brief/subscribe`, `/api/brief/unsubscribe`,
  `/api/cron/send-briefs`).

### What's NOT in Phases A/B/C

- Brief send pipeline running — blocked on domain email setup at Vercel
  DNS / Resend domain auth. Phase 21.
- Brief signup entry point in the nav — held until email is sorted.
- WC mid-tournament stakes — `deriveWCGroupStake` returns null
  post-kickoff until standings feed lands.

---

## Phase 8 — World Cup Pre-Kickoff Readiness — 2026-05-25

Tightens the run-up to the June 11 opener and lays the WC notification
path. Touches Today's hero + brief, the country page hierarchy, the
TournamentCountdown intensity ladder, and adds a parallel WC cron + WC
event detector + dispatcher branch so country-followed users get
kickoff and full-time pushes.

### Pre-tournament Today brief

- `daily-brief.ts` priority 4b — new awareness band for `8 ≤ wcDays ≤ 30`.
  Falls between the final-week intensity and the calm "Your follows
  are set." default so the 8–30 day window doesn't read as sleepy.
  Different copy depending on whether the user has a country picked.
- Existing priority 4 (≤7 days) is unchanged.

### Country page hierarchy

- `TournamentCountdown` now renders across the entire pre-kickoff arc
  (≤30 days). Three intensity tiers:
    - ≤6h  — live pip + "kicks off soon"
    - ≤24h — accent rail + "opener is tomorrow"
    - ≤7d  — accent rail + close-week copy
    - 8–30d — 1px line, "are getting ready", neutral eyebrow
- `CountryClient` now skips the empty Next Match section pre-kickoff
  when no fixtures exist for the country, since the Countdown already
  carries the page. Once the tournament starts or fixtures parse,
  Next Match returns to its normal placement.

### Kickoff-day Today hero

- `pickHero` in `today-data.ts` now emits a `wc-countdown` hero inside
  the final 24h before first whistle when no NBA hero is earning the
  slot. Tier-aware copy ("kicks off in N hours" / "first whistle in
  N hours") and country-specific headline when a country is followed.

### WC country notifications (v1)

- New `app/lib/push/wc-state-cache.ts` — per-WC-game KV state cache,
  14-day TTL, separate prefix from the NBA state cache.
- New `app/lib/push/wc-event-detector.ts` — `detectWCEvents(prev, next)`.
  Emits `wc-kickoff` on `upcoming → live` and `wc-final` on
  `live → final`. Same status-rank pin behavior the NBA detector
  uses so feed regressions don't re-fire kickoff.
- Extended `EventType` with `wc-kickoff | wc-final`, added them to
  `preset-matcher.ts` (every tier gets both — they're tournament
  bookends).
- Extended `dispatcher.ts`:
    - Recognizes WC events and matches them against `kind: "country"`
      follows (NBA events still match `kind: "team"`).
    - Falls back to `listSubscriptions()` for WC events (no per-country
      reverse index yet — v1 is friend-test scale, easy to upgrade
      later if WC fanout grows).
    - New payload branches for `wc-kickoff` ("Kickoff · USA vs MEX")
      and `wc-final` ("Full time · USA vs MEX"). No-Spoilers respected
      on `wc-final` body.
- New `app/api/cron/scan-wc/route.ts` — parallel to scan-nba; fetches
  `/api/world-cup`, runs the detector per game, dispatches.
- New `.github/workflows/scan-wc-cron.yml` — 5-minute external trigger.

### Quiet-time cleanup that landed alongside Phase 8

- Today brief priority 5 (`"USA is in Group X. We'll surface the opener
  when fixtures land."`) — removed (duplicated the bottom reminder).
- Hero spot no longer inflates the WC countdown into a big editorial
  block when there's nothing else live; the bottom `ReminderRow` does
  that work calmly. The new kickoff-day branch (≤24h) is the one
  exception that keeps the hero slot.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 19 server routes including the new
  `/api/cron/scan-wc`

### What's NOT in Phase 8

- Goal / halftime / red-card WC events — wait until v1 cron volume
  proves out the basics.
- Per-country reverse index — add when fanout grows past friend-test.
- Legacy `/legacy/world-cup` tab overflow — that page isn't reachable
  from the companion flow users see today.
- Tournament / team detail pages — Phase 1 fallbacks still hold.
- Share cards — Phase 9.

---

## Phases 1–7 — 2026-05-25

A consolidated pass across navigation, Today calmness, game detail
hierarchy, country detail copy, alert controls, snapshot fallback, and
small visual calibration. Each phase was scoped to be targeted; no
broad rewrites. Build + lint clean across all phases.

### Phase 1 — Object detail navigation cleanup

- Today "You Follow" chips: country/series chips already routed
  correctly; fixed a broken `/series/<teamAbbr>` fallback in
  `today-data.ts` for quiet team chips — now routes to `/following`.
- Following card body now opens the object's detail page (country,
  series) via a `<Link>`. Team and tournament rows leave the body
  non-interactive until their detail pages exist.
- Alert pill on each Following row is now an explicit `<button>` that
  toggles the alert/unfollow panel — separated from body navigation so
  taps don't collide.
- Object types without detail routes (team, tournament) documented and
  given safe fallbacks rather than dead-ending.

Files: `app/companion/today/today-data.ts`,
`app/companion/following/FollowCard.tsx`.

### Phase 2 — Today pinned-state redundancy cleanup

- `deriveDailyBrief` priority-2 (pinned) now suppresses the
  "game pinned" CTA when the pinned game is already the first Up Next
  card directly below the brief.
- When pinned is hidden, copy reflects state:
  `"One pinned game is live."` for live-pinned (hero pinned),
  `"One game pinned for later."` otherwise.
- Plurals preserved. Falls through cleanly to lower-priority briefs
  (No-Spoilers, live followed games, tournament countdown).

Files: `app/companion/today/daily-brief.ts`.

### Phase 3 — Game detail hierarchy refinement

- Consolidated the series dots strip + spoilery context into one
  "Series" block under the scoreboard. Removed the duplicate bottom
  Series Context card.
- `deriveHero` no longer injects the spoilery series summary or
  broadcast into the Preview hero context (both live in their
  canonical sections: Series block + WatchLine).
- `PinControls`: primary button is full width; "Open Watching" demoted
  to a quiet inline link in the helper row, only present when the
  game is actually pinned. Helper line is plain caption type without
  an underlined link.
- Pin button copy: `"Pin to Watching"` (unpinned) /
  `"✓ Pinned · Tap to unpin"` (pinned).

Files: `app/companion/game/NBALiveCompanion.tsx`,
`app/companion/game/nba-moments.ts`,
`app/companion/game/PinControls.tsx`.

### Phase 4 — Country detail pre-tournament polish

- Next Match empty (no feed): copy moves from
  `"Fixtures will appear here once the feed is ready."` to
  `"Match times are still being confirmed. We'll surface the opener here."`
- `PathTimeline` Group stage uses pre-tournament-safe language:
  state label `"Group set"` (was `"In Progress"`), detail
  `"Group is set. Matches begin June 11."` Other path stages
  unchanged.
- Small alert-state pill (dot + uppercase mono label) under the
  country header surfaces the user's current alert tier:
  `Alerts off / Quiet / Companion / All moments`. Full controls
  still live in `CountryPresetSection` below.

Files: `app/companion/country/CountryClient.tsx`,
`app/companion/country/PathTimeline.tsx`.

### Phase 5 — Compact per-follow alert controls

- `PerFollowAlerts` already used single-row expansion via `expandedKey`;
  kept the pattern. Compact rows show object badge, kind label, name,
  current state pill, and a "Change" affordance.
- Alert slot copy consistent across the screen:
  `"3 of 3 alert slots used. Follows are unlimited."`
- Section order in `SettingsClient` reshuffled so `PerFollowAlerts`
  comes before `PushSubscriptionPanel` / `NotificationPreview`.
  Push test controls preserved (Send test push now / Send in 10s /
  Disable push on this device) but no longer visually overpower the
  alert-tier picker.

Files: `app/companion/settings/PerFollowAlerts.tsx`,
`app/companion/settings/SettingsClient.tsx`.

### Phase 6 — Final game snapshot fallback

- `useWatchingData` now fetches `/api/game-snapshot/{id}` for any
  pinned game the live feeds don't know about. Resolved snapshots
  render as real PinnedItems via `nbaToPinned`, not
  "No longer in the live feed." rows. Stale state is reserved for
  pins the snapshot store also can't resolve.
- Snapshot cache persists across polls (brief feed flicker won't drop
  the historical card). Merge filters by current pinned IDs so
  unpinning still works.
- `HighlightsStack` empty state for finals:
  `"Highlights will appear when the snapshot is ready."`
- `NotFound` for unknown game IDs gets a secondary
  "Back to Following" alongside "Open Today".
- No-Spoilers behavior preserved: snapshot pages flow through the
  same `NBALiveCompanion` pipeline so `<Spoiler>`, `safeText()`, and
  the canonical hidden caption all apply.

Files: `app/companion/watching/watching-data.ts`,
`app/companion/watching/use-watching-data.ts`,
`app/companion/game/HighlightsStack.tsx`,
`app/companion/game/GameDetailClient.tsx`.

### Phase 7 — Small visual system polish

- Pinned eyebrow on Today UpNext cards now uses `var(--nba)` orange,
  consistent with the spec's "orange = active/pinned" accent rule.
  Surfaces, borders, and personal-tint logic untouched.
- Today follow-chip min tap target bumped 30px → 32px across all
  chip variants (visible chips, live chips, "+N" overflow).
- No major layout shifts. No new components. Visual system preserved.

Files: `app/companion/today/sections/up-next.tsx`,
`app/companion/today/sections/you-follow.tsx`.

---



A system-wide refactor to make every screen feel like one product. See
`DESIGN.md` at the repo root for the principles, tokens, type allowlist,
and component allowlist enforced by this pass.

### What changed

**Tokens (app/globals.css)**
- Promoted inline color values to CSS variables: `--cream`, `--cream-2`,
  `--paper`, `--ink`, `--mute-1`, `--mute-2`, `--line`.
- Sport accents centralized: `--nba`, `--wc`, `--up`, `--critical`.
- New status tones: `live`, `upcoming`, `final`, `current` — four tones
  back every chip across the product.

**Shared atoms (app/shared/atoms.tsx)**
- One of each: `StatusPill`, `Segmented`, `FilterChip`, `AppCard`,
  `Button`, `TeamRow`, `KeyMoment`, `Tension`, `Watch`, `Scenario`,
  `Eyebrow`. Every surface restyled onto this chassis.

**API hygiene**
- `/api/nba-game-detail` no longer leaks `"NEUT"` — neutral plays carry
  an empty teamAbbreviation; render layer humanizes via
  `humanizeNeutral()` ("Timeout", "Foul", "End of period", "Whistle").
- Both `/api/nba-game-detail` and `/api/live-scores` strip raw broadcast
  IDs and overly-long strings; capped at 2 friendly labels per game.
- `moment-intelligence.ts` adds `getKeyMoments(plays)` — curated by
  impact (3PT, late-game blocks/steals/dunks, last-2:00 made shots).

**NBA Today (`nba-app.tsx`, `game-card.tsx`)**
- `TonightPulseHero` drops the gradient pulse band and the conic
  `PulseRing` (deleted). Calm AppCard chassis + Tension meter.
- Scores/[Team]/Series tab bar collapses into one `Segmented` control.
- Game cards rebuilt on `AppCard`: 2px left status accent instead of
  the 3px top color strip; sparkline removed from cards (moved to the
  drawer's Compare tab); the "Line · Unavailable" pill is gone.
- `FilterPill` is now a thin wrapper over the shared `FilterChip` —
  ink-on-cream when active, optional leading dot (Live uses critical).

**NBA Live Game Detail (`game-detail-drawer.tsx`)**
- Full rewrite. `Moments / Play by play / Compare` segmented tabs.
- Moments tab uses `getKeyMoments()` and the shared `KeyMoment` atom.
- Play-by-play humanizes "NEUT" plays and renders kind codes in
  sentence form ("Made 3", "Block", "Timeout").
- Compare tab carries team stats + momentum sparkline (sparkline now
  lives only here).
- "Line" row removed entirely. Watch info uses the shared `Watch` atom.

**NBA Series Board (`series-board.tsx`, `series-card.tsx`)**
- Conference tabs collapse into one `Segmented`.
- `MiniBracketMap` restyled: compact node chips, status-driven colors,
  dashed connectors for projected paths.
- `SeriesCard` rebuilt on `AppCard` chassis. Tier-1 orange 2px border
  treatment is gone; status accent is the only signal.

**World Cup Hub (`world-cup-app.tsx`)**
- `CountdownHero` and `CountryHub` rebuilt against tokens. The {days}
  countdown number is the one allowed editorial moment per screen.
- Reminder bar simplified to one primary "Remind me" Button — the Skip
  button is gone (calendar still downloads when the user does nothing).
- `WorldCupWatchGuide` rebuilt: channel + streamer only, no IDs.

**World Cup Bracket / Your Road**
- `ProbabilityRing` deleted. The fake `42% / 36% / 22%` rings are
  replaced by the qualitative `Scenario` chip
  (`Most likely / Possible / Long shot`).
- `RoadStageCard` rebuilt on `AppCard` chassis.
- Path / Full bracket toggle uses the shared `Segmented`.

**Typography lockdown**
- Anton (display) is allowed on: Pick Your Country, First Whistle
  Loading, Series Board, NBA Finals, World Cup 2026 number, Your Road,
  Today home title, countdown number. Every other display use across
  the app moved to Inter. ~50% reduction in all-caps surface area.

**Deletions**
- `app/nba/components/moment-stake-pill.tsx` — folded into `StatusPill`.
- `PulseRing` from `pulse-primitives.tsx` — replaced by the calm
  `Tension` atom.
- `ProbabilityRing` and `[code, pct][]` alternates in `RoadStageCard`.
- The card "top color strip" pattern from every NBA card.
- All betting / spread / over-under / "Line unavailable" copy.

### Build

`npm run build` passes. tsc + eslint clean.

### Manual QA Checklist

- [ ] **Tokens**: page background reads as cream; cards as paper; no
  legacy `#1a1208` / `#f5f1ea` literals leaked through.
- [ ] **NBA Today**: hero shows status pill + Tension meter (live)
  or just caption (upcoming/final). No conic ring. No gradient band.
- [ ] **NBA Live drawer**: opens with Moments tab. Toggling to Play by
  play shows humanized text — "Timeout" not "NEUT · TIMEOUT".
- [ ] **NBA Series Board**: East/West/Finals tabs are the same shape
  as Path/Full bracket and as the drawer's Moments/PBP/Compare.
- [ ] **WC Hub**: countdown number stays big. Reminder bar has one
  button. Where-to-Watch shows "FOX / FS1" + stream — no IDs.
- [ ] **WC Your Road**: no percentages anywhere. Each stage shows a
  scenario chip ("Most likely" / "Possible" / "Long shot").
- [ ] **Share card**: PNG export still reads cleanly; footer is
  "nonoisescores.app · @nonoisescores".
- [ ] **`npm run build`**: passes.

---

## Latest Update: Opus Frontend Design Pass — 2026-05-11

### Polish Pass 2 (same day)

**NBA Series Board — desktop board structure**

- Container widened: `max-w-6xl` → `max-w-7xl`
- East and West are now visually distinct **boards**: each wrapped in a soft warm-cream card (`bg-[#fbf8f3]` + `ring-1 ring-[#e8e0d4]`) with a divider-separated header that reads `EASTERN CONFERENCE / East Board` and `WESTERN CONFERENCE / West Board`
- On xl+ screens, East and West render **side-by-side** (`grid-cols-1 xl:grid-cols-2`) so the board feels like a complete playoff path at a glance — no more sparse single-column desktop layout
- Each conference's round grid now adapts to column count: 1 column → centered, 2 → two-col, 3 → three-col. No more empty gap on `lg:grid-cols-3` when only 2 rounds are live
- **Additional Series** and **NBA Finals** sections also wrapped in matching board cards for consistent rhythm
- `LockedSeriesCard` redesigned: removed dashed border + "TBD" avatars; replaced with a single rounded pill that reads `Awaiting winners` — feels intentional, not broken/empty

**NBA NY/PHI coverage**

- Persistence logic from the earlier pass already saves any series the app has seen at `final` state with a 4-X record under `no-noise-nba-series-memory-v1`
- No code change in this polish pass — the existing mechanism does pick up a series like `NYK WINS SERIES 4-2` the moment it appears in the ESPN feed with that `seriesSummary`. From there it persists for 90 days, so NYK vs PHI surfaces on the Series Board even after ESPN drops the games from the live scoreboard window
- If a series never appears with a "WINS SERIES" summary while the app is open, it cannot be reconstructed (no backend, no historical fetch). This is a known data limitation, not a missing feature

**World Cup Table — neutral pre-tournament**

- `GroupStandingsTable` and `StandingsView` now take a `hasTournamentStarted` prop
- Pre-tournament: **no green top-2 row tint, no ✅/🟡/❌ status column, no "advancing" green-coloured points or rank** — all four teams render in neutral palette
- The status column is removed entirely from the grid template pre-tournament (5-col → 4-col) so the row doesn't keep an empty slot
- Selected country still gets a subtle row tint using the country accent at very low alpha (`${accentColor}0d`), and the bullet/coloured country name still appear — preserved as personalization, not qualification implication
- StandingsView legend pre-tournament reads: `Tap a team to see full stats · All teams start neutral until June 11`

**World Cup Groups — no-country preview**

- New `GroupsPreview` component renders below the no-country hero on the Groups tab
- Editorial header strip: `GROUPS AVAILABLE NOW —————— Pick country →`
- Shows the first 4 groups (A, B, C, D) as compact preview cards with flag + abbreviation chips — no points, no implied status
- Footer line: `Showing 4 of 12 groups. Pick your country to see yours up top.`
- Hidden once a country is selected so it doesn't compete with `CountryModule`

**World Cup Schedule copy**

- Pre-tournament empty state heading: `Full fixture times coming soon` → **`Full fixtures loading soon`**
- Pre-tournament empty state body: `Group draw is set. Kickoff times are being finalized for June 11.` → **`Groups are available now. Match times will appear here once confirmed.`**
- Groups tab empty state (when API returns zero games) uses the same updated copy for consistency

### Codex Inspection Notes

When Codex reviews this branch, the highest-value areas to inspect are:

1. `app/nba-app.tsx`
   - `BracketView`: the persistence flow (`useEffect` hydrate on mount + `useEffect` persist on completion). Verify it doesn't double-write, and that `mergeSeriesWithMemory` deduplicates correctly when a series appears in both live and remembered sets
   - `persistedFromSeries` / `hydrateSeriesFromPersisted` round-trip: ensure `Team` shape is stable so cached entries still render correctly when the `Team` type evolves
   - `BracketConferenceSection` dynamic grid class — confirm Tailwind doesn't strip `lg:grid-cols-1`/`lg:grid-cols-2` (they appear as static class strings, should be safe)
   - `LockedSeriesCard` reflow: confirm it still reads well at all column widths
2. `app/world-cup-app.tsx`
   - `GroupStandingsTable` 4-col vs 5-col grid switching — verify alignment with neighbouring rows
   - `GroupsPreview` only renders on the Groups tab when there is no country selected — confirm it disappears as soon as a country is picked
   - `StandingsView` receives `hasTournamentStarted` from both pre-tournament and active-tournament call sites
3. `app/CHANGELOG_PRODUCT.md`
   - This entry is appended under the latest section, not overwriting

Build: `npm run build` passes cleanly.

---

### Files Changed (initial pass)

- `app/world-cup-app.tsx`
- `app/nba-app.tsx`

### UX / Design Changes

**World Cup — Unlocked tabs pre-tournament**

- Removed the locked "Table & Schedule unlock June 11" toolbar pattern
- Pre-tournament now renders the same working Groups / Table / Schedule tab toggle as the active tournament
- Each tab has a real pre-tournament state:
  - **Groups**: opening fixtures grid (existing behaviour) or "Fixtures land soon" card when API returns nothing
  - **Table**: full 12-group standings with every team at 0-0-0-0 (`calcGroupStandings` already handles empty games), preceded by a soft dashed-border note: "Every team starts on 0. Standings light up as matches finish on June 11."
  - **Schedule**: fixture rows if data exists; otherwise "Full fixture times coming soon" card with kind copy — no locked feel
- New helper: `PreTournamentTableNote` — dashed-border, accent-tinted, lives only on the Table tab pre-tournament

**NBA — Series Board with memory**

- Renamed "Playoff Bracket" → **Series Board** (both the tab label and the in-page header)
- New persistence layer: completed series are now saved to `localStorage` under `no-noise-nba-series-memory-v1` with a 90-day TTL
  - When a series finishes (e.g. NYK 4 - PHI 2), it's persisted with team data, win counts, conference, round, and summary
  - When `BracketView` mounts, those persisted series merge with the live API data so completed earlier rounds stay visible on the board even after they roll out of the ESPN scoreboard window
- `BracketView` now uses `useMemo` + `useEffect` instead of computing series during render — safer for the new persistence flow
- `BracketEmptyState` copy refreshed: editorial "NBA Playoffs / Series Board" stack and warmer body copy — no more "Bracket loading soon"

### Feature Changes

- **WC tabs explorable now**: users can browse Groups / Table / Schedule before June 11
- **NBA Series Board persistence**: completed first-round series survive the API window — fixes the "NYK beat PHI but doesn't show up" bug as soon as that series has been seen at least once with a final summary

### Data / Logic Changes

- `app/nba-app.tsx`
  - New types: `PersistedSeries`
  - New helpers: `readSeriesMemory()`, `writeSeriesMemory()`, `persistedFromSeries()`, `hydrateSeriesFromPersisted()`, `mergeSeriesWithMemory()`
  - `BracketView` adds `useState<PersistedSeries[]>` + two `useEffect`s (hydrate on mount, persist on completion)
  - `localStorage` writes are guarded with `try/catch` and `typeof window` checks (SSR-safe)
- `app/world-cup-app.tsx`
  - Pre-tournament render no longer hard-codes `viewMode === "groups"` — it now reads `viewMode` state like the active-tournament branch
  - `ScheduleView` empty-state branch updated for nicer pre-tournament copy (no longer says "Schedule unlocks June 11")

### Known Risks (for Codex review)

- The persistence layer only captures series after they've been seen in a `final` state with a `seriesSummary` or 4-0/4-1/4-2/4-3 win count. If a user opens the Bracket tab for the first time *after* a series has already rolled out of the API window, that series will remain missing until the next playoff round brings it back into context. Acceptable for now — first user to see Bracket post-series-end will pin it for future sessions.
- TTL is 90 days. If the app is left untouched across multiple NBA seasons, stale data could appear. Mitigation: the version-suffixed key (`-v1`) lets us bump and invalidate cleanly.
- `StandingsView` pre-tournament renders 12 groups × 4 teams of zeros. That's a lot of vertical scroll for a zero-state. If it feels heavy in practice, consider collapsing to "your group only" when a country is selected.

### Manual QA Checklist

- [ ] **WC pre-tournament (today)**: Open World Cup page. Groups / Table / Schedule tabs all tap-switch without disabled states
- [ ] **WC Table pre-tournament**: shows dashed-border "Pre-tournament table" note + all 12 groups with zeros; selected country (if any) is subtly highlighted in its row
- [ ] **WC Schedule pre-tournament**: shows fixtures grouped by group letter if API returns them, otherwise the "Full fixture times coming soon" card
- [ ] **WC no-country state**: Countdown card still prompts "Pick your country." with the green Pick Country button
- [ ] **WC selected-country state**: Country module still renders flag/name/group/opponents/change
- [ ] **NBA Scores tab**: unchanged — Live / Next / Final / My Team filters still work
- [ ] **NBA Series tab label**: now reads "Series" instead of "Bracket"
- [ ] **NBA Series Board header**: reads "Series Board" with "NBA Playoffs" eyebrow + pills (no description sentence)
- [ ] **NBA persistence**: After a series finishes (e.g. DET 4-2 CLE or similar), reload the page in a few minutes — the completed series stays on the Series Board even if ESPN drops the games from the live window
- [ ] **NBA empty state**: clear localStorage `no-noise-nba-series-memory-v1` + visit Series tab during a non-playoff window — sees the new "Series Board / Series cards appear here as playoff games come in" empty state
- [ ] **Build**: `npm run build` passes with no TypeScript errors
- [ ] **No horizontal overflow** on iPhone SE (375px) for WC pre-tournament tabs

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

## Source of truth

The stale "Current Direction" / "Future Roadmap" sections that used to
live at the foot of this changelog have been retired. They drifted out
of sync with the actual phase numbering above. Authoritative sources
are now:

- **Positioning + product model:** `app/PROJECT_CONTEXT.md`
- **Active phase + brand rules:** `AGENTS.md`
- **Forward roadmap (Phases 9–22+):** `docs/ROADMAP.md`
- **Per-phase changelog:** this file (append above this line)
