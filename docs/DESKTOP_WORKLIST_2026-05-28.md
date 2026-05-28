# Desktop worklist — synthesized from the 4-specialist audit (2026-05-28)

## STATUS (executed 2026-05-28, "go all-in P0+P1+P2")

All P0 + the actionable P1 + all P2 text/SEM landed. tsc clean,
31/31 tests, `next build` green.

- **P0.1 WC game detail parity** — DONE. `WCGameDetail.tsx` now mirrors
  the NBA recipe: `md:max-w-4xl` + `md:grid-cols-[1fr_300px]` with match
  events + highlights in a sticky right rail (inline `md:hidden` copies
  on mobile, unchanged).
- **P0.2 Widen rail-bearing detail pages** — DONE (pragmatic). Series /
  Tournament / Team / Country mains lifted to `md:max-w-2xl` (comfortable
  single-column fill; a full second-column rail per page was judged a
  broad rewrite, out of scope per AGENTS coding rule). Revisit per-page
  rails post-launch if desired.
- **P0.3 groups full page** — DONE. Page → `md:max-w-4xl`; WCGroups full
  grid → `grid-cols-2 md:grid-cols-3`.
- **P0.4 Unify widths** — DONE for Today (`5xl`) + Following (`5xl`).
  Watching intentionally kept `md:max-w-3xl`: it holds 1–3 pinned games
  (a focus surface) and would stretch badly at 5xl.
- **P0.5 Brief pages** — DONE. Both `/brief/subscribe` + `/brief/preview`
  now pass `desktopNav="detail"` (rail + back path).
- **P1.6 Following 3-col** — SKIPPED by design. `FollowingDashboard.tsx:188`
  comment documents that a 3rd column collides the kind-eyebrow with the
  alert pill; 2 columns is the deliberate final state. Not a bug.
- **P1.7 Hover / focus-visible** — DONE on `DesktopSidebarNav` links
  (hover bg + focus-visible outline ring; inline `transparent` dropped so
  the hover utility applies).
- **P1.8 Keyboard hint** — DEFERRED. `[ ]` only works with 2+ pins and the
  current game pinned; a static rail hint would mislead most of the time.
- **P2.9–12** — DONE (em-dash/score-string fixes, "All moments"→"Close
  games" ×6 files, groups SEM: sitemap + meta + canonical + WC H1, title
  suffixes standardized).
- **P2.13 contact email** — FLAGGED, not changed. `about` + footer use
  `nonoisescores@gmail.com`; AGENTS.md references
  `tatlicioglu.ibrahim@gmail.com`. Needs the owner to confirm which is
  canonical before a sweep.
- **P2.14 JSON-LD** — DEFERRED (lower priority, no risk to ship without).


Creative director + desktop UX + chief-of-copy/SEM + PM all audited the
desktop experience read-only. Strong convergence. This is the merged,
de-duped, prioritized worklist.

## The one theme
The "lean" desktop pass (Phase 22.5-D) added the left rail (`desktopNav`)
to **every** page, but only Today / Following / NBA-game-detail got a
widened body. Series, Team, Tournament, Country, the `/tournament/[id]/groups`
full page, and the Brief pages still cap at `max-w-md` — so on a 1440px
screen the rail sits next to a 448px column with ~770px of empty cream.
The rail and the body disagree about how wide the product is, which is
what makes desktop feel like "a mobile app with a nav bolted on."

**Foundational move (do first):** define ONE desktop content shell —
a single max-width + horizontal padding + top-of-page header rhythm —
and route every `desktopNav` page through it. Then each detail page
either earns a real second column (the NBA-game-detail recipe: main +
sticky rail) or honestly drops to a centered reading column. Today
(`md:max-w-5xl`), Following (`3xl/5xl`), Watching (`3xl`), NBA game
(`4xl`) currently use four different widths — the column edge jumps on
every tab switch. Unify them.

## P0 — Desktop layout (visual, needs a review pass after)
1. **WC game detail parity.** `WCGameDetail.tsx` is hard `max-w-md` with
   NO desktop rail, while its sibling `NBALiveCompanion.tsx` has the full
   `md:max-w-4xl` + sticky `md:grid-cols-[1fr_300px]` aside — and they
   render from the *same* router. Mirror the NBA recipe. (CD, UX, PM all flagged; worst offender.)
2. **Widen the rail-bearing detail pages.** Series (`SeriesClient.tsx:60`),
   Tournament (`TournamentClient.tsx:68`), Country (`CountryClient.tsx:58`),
   Team (`TeamClient.tsx:164`) all pass `desktopNav="detail"` but cap
   `max-w-md`. Lift to `md:max-w-3xl` minimum; reuse the NBA right-rail
   (series strip / related fixtures / share) where it fits. Country is
   most visible (SEO entry).
3. **`/tournament/[id]/groups` full page.** Wrapper caps `max-w-md`
   (`groups/page.tsx:35`) while `WCGroups` renders `grid-cols-2` — the
   "spread out" page is more cramped than the preview. Widen to
   `md:max-w-4xl` + `md:grid-cols-3/4`.
4. **Unify content max-width** across Today/Following/Watching/detail to
   one scale (e.g. `md:max-w-5xl`, `md:px-8`).
5. **Brief pages orphaned on desktop.** `/brief/subscribe` + `/brief/preview`
   have NO `desktopNav` at all — no way back into the app. Add the rail
   (or a CrumbBar) and widen the preview to frame the email nicely.

## P1 — Desktop polish (low effort)
6. **Following 3-col at lg+** never shipped (task #125 mismarked; plan
   promised it). `md:grid-cols-2 lg:grid-cols-3`.
7. **Hover / focus-visible states.** Sidebar links + cards use touch
   `active:scale` only; desktop pointer users get no feedback. Add
   subtle `hover:`/`focus-visible:ring`.
8. **Keyboard-nav hint.** `[` `]` between pinned games exists but is
   invisible — add a faint "`[` `]` to switch games" in the game-detail
   rail at md+ when 2+ pins.

## P2 — Copy + SEM (low risk, text-only — safe to do now)
9. **Em/en-dashes (voice rule violation):** `features/no-spoilers/page.tsx:30`
   (literal em-dash); en-dashes in score strings at `LandingHero.tsx:258`,
   `features/quiet-sports-alerts/page.tsx:62`, `guides/watch-games-later.../:61`,
   `guides/follow-vs-pin/:47`.
10. **Tier-label drift:** "All moments" → "Close games" in 6 files
    (`features/quiet-sports-alerts:41`, `features/sports-circle:62,64`,
    `guides/follow-vs-pin:83`, `compare/apple-sports-alternative:66`,
    `how-it-works:46`, `about:39`).
11. **SEM — `/tournament/[id]/groups` is a wasted high-intent landing.**
    No meta description, no canonical, NOT in `sitemap.ts`, generic H1
    ("All groups."). Add to sitemap, add description + canonical, lead H1
    with "World Cup 2026 groups." (The pre-kickoff "world cup groups"
    query target.)
12. **Metadata title consistency:** several routes drop the
    `| No Noise Scores` suffix (`how-it-works:11`, both compare pages,
    two guides). Standardize.
13. **Contact email inconsistency:** about + footer use
    `nonoisescores@gmail.com`; AGENTS.md references
    `tatlicioglu.ibrahim@gmail.com`. Confirm which is current.
14. **JSON-LD + internal links:** structured data only on the landing
    shell; add `SportsEvent`/`BreadcrumbList` to WC country + tournament
    pages, and link the groups + country pages from the WC guide/landing.

## Notes
- Content pages (`/features`, `/guides`, `/compare`) read fine full-width
  as-is — desktop-native by design. Leave.
- Tasks #124–127 are marked complete but only NBA detail rail + pips +
  keyboard nav actually landed; WC detail rail and Following 3-col did not.
