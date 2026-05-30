# Learnings

A working doc of principles, mental models, and small unlocks
captured while shipping No Noise Scores v1.0 to the App Store.
Written to apply to future projects — not a postmortem of this
one. Examples are drawn from this build because they're fresh,
but the underlying lessons travel.

Organized roughly by impact size: the big unlocks first, then
workflow, then domain-specific principles, then the small things
that punched above their weight.

---

## The big unlocks

These changed how the product turned out, not just what shipped.

### Lock the words before you build

Stable copy = stable product. The day a one-line positioning, a
tagline, and a subtitle got locked into a project file (and
"never paraphrase" written next to them), copy drift died across
the entire codebase. Decisions downstream — UI components,
screenshots, App Store metadata, social posts — all snapped to the
same vocabulary without re-litigating.

The lesson: lock the words in the first week. Write them into the
project's permanent context (CLAUDE.md, AGENTS.md, README). Treat
edits to those lines as breaking changes.

### The negative is the position

What you *don't* ship is sometimes more memorable than what you do.
"No feeds. No ads. No noise." carried more weight than any feature
list. Standing for *not-X* gives users a reason to choose you.

The lesson: when the category is loud, the quiet pitch wins.
Identify what every competitor includes that's actually
load-bearing for nobody. Make leaving it out the headline.

### Phases small enough to revert

When each shippable unit is small, experiments are free. Two
features shipped this build and got reverted (Add to Calendar,
Sports Circle prototype) — neither cost anything because nothing
else depended on them. The big rewrites that scare engineers
("we'll refactor when we have time") never happened; small phases
made them unnecessary.

The lesson: a phase that takes >2 weeks is probably two phases.
A phase you can't revert in one PR is probably the wrong size.

### Each tool fights a different blind spot

Static analysis catches a different bug class than visual QA. Code
review catches a different class than real-user testing. The
widget-refresh lag on tournament follows was invisible to all
three of the first two; only a real user with a real follow on a
real device found it.

The lesson: stack the checks. Don't trust one. The audit pass that
finds nothing is the audit pass that's blind.

### Pair with multiple agents intentionally

One Claude wrote code. A separate Claude rendered design previews
(screenshots, social tiles). A third did review passes with fresh
eyes. Each surfaced things the others couldn't see — partly
because they had different context windows, partly because they
prompted themselves differently.

The lesson: a single agent's output isn't a second opinion. Spawn
new sessions for review work. Use specialized models (Plan,
Explore, design-only) for specialized work.

### Document decisions, not just code

A `CHANGELOG_PRODUCT.md` capturing *why* each phase shipped (or
reverted, or got shelved) is worth more than a clean git history.
Two weeks later, "wait, why did we drop X?" is answered in 30
seconds instead of an archeology dig.

The lesson: write the decision down in the project, not in chat.
One-liner per decision. Future-you is the audience.

### Set up the deepest-stack debugger on day 1

When the platform's normal debugger fails, you fall back to the
next layer. For iOS that's Console.app filtered by process. For
web it's Chrome's perf panel. For network it's a packet capture.
The teams that ship through hard bugs are the teams that set
those up before they need them.

The lesson: spend two hours on day 1 wiring up the heavy-duty
diagnostic tools. You won't need them yet. You'll need them at
3am the night before launch.

### Real users surface things audits never will

The most painful production-quality bugs (widget refresh lag,
TestFlight black screen, Live Activity hang) only surfaced in
actual install + use. Not in dev. Not in any automated test. Not
in any review pass.

The lesson: get the build on a real device on a non-engineer's
phone as early as possible. TestFlight beta of 5 friends is worth
10× any QA process. Their feedback isn't always actionable but
it's always honest.

### Batch the expensive cycles

Some cycles are slow: TestFlight Archive (~30 min), App Store
review (24-48h), DNS propagation (hours), email deliverability
warmup (days). Treating these like git commits ("one more fix
real quick") burns days.

The lesson: maintain a single "next cycle" batch list. Don't
push a slow cycle until the batch is meaningfully full. The
discipline of waiting feels wrong but ships faster.

### The hard checklist beats the easy checklist

The night-of-submission blockers weren't engineering — they were
paperwork (DSA non-trader ID, privacy manifest, encryption
posture, iPad screenshot requirements). These are unsexy and
easy to defer. They're also exactly what blocks ship.

The lesson: identify the paperwork checklist on day 1 of any
launch process. Run it in parallel with engineering. Treat each
form as a real task.

### Establish baselines on day 1

Screenshot dimensions, supported device targets, encryption
posture, copy lock, brand palette, fonts, voice rules. Late
changes to any of these cascade — every screenshot, every page,
every social asset has to follow.

The lesson: write the baselines into the project before the first
PR. Audit drift weekly. Cheap to maintain, expensive to fix once
drifted.

---

## Workflow

### Phases as the unit of work

Not features. Not sprints. Each phase has a definition of done, a
go/no-go gate, and a clear revert path. "Phase 9: Friend Beta
Gate" is a phase. "Add dark mode" is a phase. Phases of <5 days
are usually right. Phases of >2 weeks are usually two phases.

### Track open work as ordered, not categorical

Backlogs sorted into "P0/P1/P2" get stale. Ordered TODO lists
(this then this then this) stay fresh because the ordering forces
prioritization. When something changes, you reorder.

### Read the docs first

Apple's, Google's, the framework's. The hour reading the actual
ActivityKit docs would have saved the two days lost to the
Capacitor proxy hang. Most painful bugs are documented somewhere;
you just didn't read it.

### Verify before you celebrate

A tool result that says "Edit succeeded" isn't a code change
working. An agent that says "fix applied" isn't a fix verified.
Read the diff. Run the build. Test the path.

### A `docs/` folder is a working tool, not a deliverable

Use it during the build, not after. Plans go there. Decisions go
there. Roadmaps go there. The discipline of writing forces the
fuzzy idea into a real shape.

### Commit hygiene matters more than test coverage

A clear commit history with descriptive messages is worth more
than 90% test coverage on a small product. Tests catch
regressions; commits explain intent. Future-you reads commits 100×
more than they re-run tests.

---

## Frontend principles

### Inline the smallest, most fragile bootstrap code

Theme detection, error catchers, splash logic — these have to run
before paint, before React mounts, before anything else can break.
Inline them in `<head>` with `dangerouslySetInnerHTML`. They're
<200 bytes each, never block render, and survive every kind of
JS-bundle failure downstream.

Examples: a theme bootstrap script that reads localStorage and
sets `data-theme` on `<html>` prevents flash-of-unstyled-content.
A global error catcher that paints a visible error panel turns
"app shows black screen" into "app shows actual error message" —
making field debugging actually possible.

### Don't auto-flip with `prefers-color-scheme`

Honoring the OS theme preference seems polite. In practice, it
destabilizes brand identity at random for users on dark OS who
want a light app (or vice versa). Pick a default, make the toggle
explicit, persist it.

### Font loading via the framework's font system

Next.js's `next/font`, Vite's font plugin, whatever your framework
ships. Don't hand-roll. `display: "swap"` is almost always right.
Three CSS variables on `<html>` is enough surface area to swap
faces without touching components.

### Splash screens are brand surface

A white flash on cold launch is a tax you pay on every install.
Per-device splash PNGs sized for each iPhone width × height ×
DPR — and the manifest's `background_color` as a fallback for
devices you didn't cover — eliminate it. Worth the morning of
generation work.

### Live preview > screenshots in design review

Looking at a screenshot, you'll miss what looking at the rendered
page would have caught. Set up a live preview URL on every
component you're reviewing. Some toolchains (Storybook, Vercel
preview deploys) make this cheap. Use them.

---

## Mobile / native principles

### Drop platform support you can't deliver on

If your app is mobile-only, drop iPad / Mac / Vision targets from
your Xcode project. Claiming support without delivering it leads
to 1-star reviews and rejection-risk in App Review (Apple
reviewers test on iPad if you say iPad).

### Match supported destinations to your actual layouts

iPhone-only is a *strategy*, not a limitation. Ship the
mobile-first product on the mobile-first platform. Add iPad in
v1.x when you've designed an iPad layout.

### Capacitor / hybrid app footguns

When using any "bridge" architecture (Capacitor, Cordova, React
Native bridges), the line between JS and native is a sharp edge.
Async unwrap of native proxies, plugin registration order,
storyboard symbol resolution in Release vs Debug — these are the
kinds of bugs that don't reproduce in dev and surface only on
TestFlight.

The lesson: when something works in dev and fails on a release
build, the difference is usually symbol visibility, code-stripping,
or Promise/proxy semantics. Console-log the boundary.

### Inspectability in Release builds is non-negotiable

`isInspectable = true` on WKWebView in iOS 16.4+. Without it, you
can't attach Safari Web Inspector to TestFlight builds. Strip the
line for the final App Store build if you want — but for the
launch-window debugging cycle, it's the single most valuable
toggle.

### Privacy manifests + encryption posture: declare on day 1

Apple requires `PrivacyInfo.xcprivacy` for any app using "Required
Reason APIs" (UserDefaults, file timestamps, system boot time,
etc.). Apple requires `ITSAppUsesNonExemptEncryption` declared
per build. Both can be set once in Info.plist and forgotten — or
deferred to submission day and become emergencies.

The lesson: configure them with the first build, not the last.

### App icons must be opaque

App Store rejects PNGs with alpha channels (error 90717). Flatten
1024×1024 onto an opaque background before export. Treat this as
a discipline of all asset generation, not a one-off fix.

### Use targeted reload APIs, not global ones

`WidgetCenter.reloadTimelines(ofKind:)` over
`reloadAllTimelines()`. `URLSession`'s task-level cache control
over global. The targeted call is usually higher priority and
lower battery cost; iOS defers the global call aggressively. The
lesson generalizes: when an API has a scoped form, prefer it.

### Don't trust system reload hints

Even with targeted reloads, iOS sometimes drops them. Build a
self-scheduled fallback (a 15-minute timeline policy in WidgetKit's
case). The system is allowed to drop your hint; design for that.

### Codable evolution needs custom decoding

The day you add a field to a deployed `Codable` struct, old
payloads stop decoding. A custom `init(from decoder:)` that
defaults missing fields takes 10 minutes and prevents the
production crash. Do it from the first time a struct hits the
wire.

---

## Debugging principles

### When the platform debugger fails, drop a layer

Web Inspector won't attach? Console.app with process filter. App
hangs? Spawn a sysdiagnose. Network slow? Packet capture. There's
always a deeper layer; learn how to reach it before you need it.

### Reproduce on a real device early

Simulators lie about timing, memory pressure, network behavior,
and any system-managed resource (push tokens, App Group writes,
keychain). The bug that doesn't reproduce in Simulator and only
fires on device is the bug that ships to users. Pay the cost of
testing on a real device.

### Filter by process / context, not by severity

Console output from a misbehaving app is buried in 10,000 lines of
system noise. The trick isn't tail -f; it's filtering. Console.app's
`process:App` filter changed days of "where are my logs" into
"there's the issue." Same principle: in browser devtools, filter by
type/domain. In server logs, filter by request ID.

### Read the source, not the docs, for footguns

Public docs document the happy path. Footguns live in the source.
For OSS dependencies you're depending on heavily, browse the
source for the boundary you're working against. The Capacitor
proxy footgun was discoverable in 10 minutes of source reading.

### When a Release build fails and Debug works

It's almost always one of: symbol stripping (Release strips more),
optimization-level reordering, code signing differences,
storyboard/asset compilation differences, or environment
differences (production endpoints, certs, entitlements). Diff
each suspect category until you find it.

### Console output is the first thing to instrument

`print("🔌 [System] Did X")` at every significant boundary in
your native code costs nothing and saves days. The single most
valuable diagnostic in this whole build was the chain of
`🔌 [NoNoise]` lines that proved (when absent) the bridge wasn't
loading.

---

## Shipping & store principles

### Submission is a checklist, not an event

The night-of-submission emergencies aren't engineering, they're
admin: privacy manifest, encryption posture, DSA non-trader ID,
content rights declaration, age rating, support URL, privacy
policy URL, build number alignment across targets, screenshot
dimensions for the current baseline, demo notes for the
reviewer. Run the checklist in parallel with engineering.

### Lock metadata source of truth in the repo

A file like `docs/APP_STORE_CONTENT.md` containing the subtitle,
keywords, description, etc. — kept in version control — means
copy gets reviewed like code. No re-typing into App Store Connect
from memory.

### Ship metadata and binary as separate cycles

Most rejection-class errors are metadata, not binary. Metadata
fixes don't require new builds. Plan v1.x metadata updates as
their own cadence (promotional text, screenshot refreshes) and
keep them out of binary release cycles.

### A demo note for the reviewer is free differentiation

Most apps submit with no reviewer notes. A clear 200-word note
that walks the reviewer through the happy path takes 10 minutes
and meaningfully reduces "Apple couldn't find X" rejections.

### Auto-release is a footgun for first releases

"Automatically release after approval" feels nice. It means your
launch happens whenever Apple's reviewer happens to approve —
2am, on a holiday, while you're at brunch. Use manual release for
v1.0 so you control the launch moment.

---

## Copy & voice principles

### Voice is detectable

Readers can tell when copy was written by a model on autopilot.
Em-dash-bracketed clauses, "we don't just X, we Y" rhythm,
sensational adjectives, and FOMO language all read as marketing
inflation. Plain, short, declarative sentences read as human.

### Three forbidden phrases is a useful technique

Pick the three phrases that would betray your brand if they
appeared. Write them into the project context with "never use
these, even sarcastically." It creates a sharp veto rule that's
easy to apply.

### Locked positioning lines override convenience

When the brand has a locked one-liner, every "alternative phrasing
that might fit here" is wrong. The cost of varying for a single
slot is higher than the cost of slight awkwardness — because
readers see the brand across many slots and the consistency does
the work.

### Honest beats fake in onboarding

"Test n/a" is better than a fake "Test Sent." Empty states should
say what they are. Onboarding that pretends features work when
they don't is the fastest way to break trust.

### Avoid the marketing rhythm of em-dashes

User-facing copy that uses em-dashes for bracketed clauses reads
as machine-generated. Use periods. Use parentheses. Em-dashes are
fine in code comments and internal docs — never in product copy
shipping to humans.

---

## Small things that punched above their weight

### Eyebrow + headline + subtitle as a layout primitive

A mono uppercase eyebrow ("TODAY"), heavy display headline ("One
game tonight."), and small body subtitle is a layout that scales
from app screen to App Store screenshot to social tile without
modification. It's almost-free editorial polish.

### A single accent color used sparingly

Rust orange in this brand. Used only as: eyebrow text, the pip on
the brand mark, a left accent strip on the pinned card, a tiny
ahead-indicator on the Live Activity. Restraint makes the accent
mean something. Decorate everything in your accent and it stops
being an accent.

### Mono numerals

`monospacedDigit()` on any number that changes (scores,
countdowns, timers). The 0.5px shifts from proportional digits
look like jitter at glance distance. Mono digits feel premium.

### Cream as a base

The default background of most apps is white. Switching to cream
(#f1ead8) immediately reads as premium and editorial — costs
nothing, changes everything visually.

### A single brand mark used at three sizes

A small (~16px) mark for in-context use, a medium (~32px) for
headers, a large (~64px+) for splash and social. The same
proportions work at every size if you build it right. No
size-specific variants required.

### The "calm CTA"

A footer line like "On the App Store" + "today." with no
download badge, no arrow, no urgency badge. Trusts the reader to
act. Reads as confident, not desperate.

### "Today / Following / Watching" as IA

Three-tab navigation that maps to three mental states (now /
preferences / a thing I'm tracking right now) generalizes across
sports apps, productivity apps, news apps, anywhere the user is
asking "what do I see when I open this?" Worth the IA work to
land on names this clean.

---

## Things to do day 1 of the next project

A starter checklist, derived from where this build's biggest
preventable losses came from.

- [ ] Lock the one-line positioning, tagline, and subtitle. Write
      them into a project-context file with "never paraphrase."
- [ ] Lock the three-color palette + display/body/mono fonts.
- [ ] Pick a brand mark. Ship it at three sizes.
- [ ] Decide platforms (iPhone-only? web-only? iPad too?). Match
      project targets to that decision.
- [ ] Set up the deep debugger (Console.app filter, server log
      aggregator, etc.) before you write any code.
- [ ] Write a `docs/DECISIONS.md` or `CHANGELOG.md`. Add the
      first decision to it.
- [ ] Identify the paperwork checklist (privacy policy, age
      rating, DSA, store metadata). Schedule it parallel to
      engineering.
- [ ] Configure encryption posture + privacy manifest + opaque
      icons in the first build.
- [ ] Create a metadata source-of-truth file
      (`docs/APP_STORE_CONTENT.md` or equivalent).
- [ ] Set up a real-device + real-user test loop. TestFlight to
      yourself + 3 friends from build 1.
- [ ] Forbid three phrases in your voice. Write them down.

---

## Things that worked unreasonably well

- **The negative pitch.** "No feeds. No ads. No noise." carried
  more weight than any feature list.
- **Cream + dark ink + rust as the only colors.** Restraint reads
  as premium.
- **Bricolage Grotesque as display.** Confident and condensed
  without being heavy.
- **Three-tier alert presets ("Quiet / Companion / Full
  Details").** Maps to mental models without explanation.
- **A single "moments that matter" framing.** Filters every
  feature decision: "is this for the moment, or for the season?"
- **The eyebrow + headline + subtitle layout primitive.** Scales
  everywhere.
- **Phases as work units.** Without phases, this never ships.
  With phases, every week ends with something working.
- **Reading App Store Connect with a fresh agent pre-submit.** A
  full second-eye read caught 6 issues that would have been
  first-rejection material.
- **Documenting decisions, not just code.** The decision log saved
  hours of "wait, why did we drop that?"
- **Setting up Web Inspector for TestFlight from build 1.** The
  hour spent wiring `isInspectable` saved days during
  launch-window debugging.
- **Multi-agent pairing.** Writing-Claude + Design-Claude +
  Review-Claude consistently beat any single agent.
