# No Noise Scores — Roadmap

This file lists the work ahead, sequenced. Phases 1–8 and A/B/C are
complete (see `app/CHANGELOG_PRODUCT.md` for per-phase detail).

Each phase below is one go/no-go unit. Do not jump ahead. Phases are
ordered for execution: friend-beta gate first, then web architecture +
landing + SEO content, then in-app polish, then long-horizon items.

---

## Locked positioning

These lines are the brand. Do not paraphrase, do not invent
alternatives, do not let copy drift.

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store / subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

---

## Two products on one domain

`nonoisescores.app` hosts both:

1. **The app experience** — mobile-first PWA at `/` (mobile), plus
   `/following`, `/watching`, `/game/[id]`, etc.
2. **The website / content layer** — desktop landing shell at `/`
   (desktop), plus `/features/*`, `/guides/*`, `/compare/*`,
   `/about`, `/privacy`, `/changelog`, `/beta`.

`/app` is the canonical "open the app on any device" entry.

---

## Phase 9 — Friend Beta Gate

**Goal:** unblock sharing the app with 5 trusted friends.

- No-Spoilers leak audit (titles, push previews, OG share images,
  first-paint flicker).
- PWA install CTA on Today (one dismissible "Install for game alerts"
  card; iOS Safari instructions chip, Android `beforeinstallprompt`).
- Settings rename: "Watch + Alerts" → "Alerts & Notifications" to stop
  colliding with `/watching`.
- Manifest sanity check on iOS + Android.
- `FirstRunStrip` clarifies Follow vs Pin.

**Risk:** Low. No structural changes.

**Acceptance:** A friend can install, follow a team, get a push, and
turn No-Spoilers on/off without coaching.

---

## Phase 10 — Web Route Architecture Split

**Goal:** decide and implement the desktop-vs-mobile routing model
before building anything else web-facing.

- `/` becomes responsive-aware. Desktop = landing shell (Phase 11).
  Mobile = current Today screen.
- `/app` added as canonical "open the app on any device" entry.
- Redirect map documented.

**Risk:** Medium. Routing changes can break PWA install state.

**Don't touch:** existing app routes.

---

## Phase 11 — Desktop Landing Shell

**Goal:** turn the desktop homepage from "mobile app floating in
whitespace" into a real product page.

- Hero block: left product story + install/beta CTAs; right phone-sized
  live preview.
- "How it works" capsule (Follow / Alert / Pin / No-Spoilers).
- "Built for the moments" band (NBA Playoffs + WC 2026 + NFL teaser).
- "Why it feels different" pillars.
- FAQ section.
- Footer with quiet library links (preview SEO structure).

**Risk:** Medium-high — most visible thing strangers see.

**Don't touch:** mobile screens; cream chassis; typography.

---

## Phase 12 — SEO Foundation

**Goal:** plumbing so content pages we ship next are discoverable.

- `app/robots.ts` — allow Googlebot, OAI-SearchBot, ClaudeBot,
  PerplexityBot; disallow user-state routes.
- `app/sitemap.ts` — generated from static routes.
- JSON-LD on landing (Organization + SoftwareApplication +
  WebApplication).
- Per-route metadata pass (title, description, canonical, og:image).
- OG image refresh.
- `<noindex>` on stateful routes.

**Risk:** Low. Pure plumbing.

---

## Phase 13 — Core Content Pages

**Goal:** the four pages every legitimate product needs.

- `/about` — what is this, who made it, the philosophy.
- `/privacy` — required for PWA + push notifications.
- `/changelog` — public-facing editorial summary of what shipped.
- `/beta` — friend beta sign-up form.

**Risk:** Low.

---

## Phase 14 — Feature Pages (the "Manifesto" set)

**Goal:** editorial pages that articulate the product's position.

- `/features/no-spoilers`
- `/features/sports-circle`
- `/features/quiet-sports-alerts`
- `/how-it-works` — master manifesto walking through Follow → Alert →
  Pin → No-Spoilers as one story.

**Risk:** Low-medium. Voice quality matters.

---

## Phase 15 — Guide Pages

**Goal:** practical user education + long-tail search.

- `/guides/how-to-add-to-iphone-home-screen`
- `/guides/follow-vs-pin`
- `/guides/watch-games-later-without-spoilers`

**Risk:** Low.

---

## Phase 16 — Comparison + Niche Capture Pages

**Goal:** capture intent traffic from competitor searches + sport
moments.

- `/compare/apple-sports-alternative`
- `/compare/espn-app-alternative`
- `/nba-playoffs-alerts`
- `/world-cup-2026-app`

**Risk:** Medium — tone is everything; can read as desperate marketing
if not careful.

---

## Phase 17 — Following = Sports Circle

**Goal:** make `/following` feel like a place, not a settings list.

- Empty-state personality treatment.
- Visual grouping by moment-section.
- Subtle live-state indicators (tiny SevenDotStrip on team cards).
- "Your sports circle" framing.
- Visual differentiation: Follow chips (filled) vs Pin chips (outlined
  + pin glyph).

**Risk:** Medium. Easy to over-design.

---

## Phase 18 — Watching Deepening

**Goal:** Watching screen reads as substantial when populated.

- Bigger visual treatment for 1 pinned game.
- Side-by-side cards on wider widths.
- Pre-game / post-game state-specific treatments.

**Risk:** Low-medium.

---

## Phase 19 — Dark Mode (warm dark)

**Goal:** phones in dark environments deserve a treatment that
respects the cream identity.

- Token system update: warm dark surface (not pure black).
- Auto-detect via `prefers-color-scheme` + manual toggle.
- Every component verified in both modes.
- Sport accents shift slightly for dark readability.

**Risk:** Medium-high. Dark mode is where calm web apps usually fail.

**Don't touch:** the cream as the default daylight experience.

---

## Phase 20 — Retention Plumbing

**Goal:** small UX touches that keep users coming back.

- "Test push" button on each per-follow row.
- One new custom alert tier: "Q4 with margin < 6."
- Better empty-state copy on every empty screen.

**Risk:** Low.

---

## Phase 21 — Brief Launch (gated on domain email)

**Goal:** turn the dark-but-ready Brief infrastructure into a live
product.

- Vercel DNS verification with Resend (SPF / DKIM / DMARC).
- `RESEND_API_KEY` + `BRIEF_FROM` env vars in production.
- cron-job.org entry calling `/api/cron/send-briefs` ~8am local.
- List-Unsubscribe header added.
- Subtle entry point: "Get a calm morning recap →" on Quiet Recap Card
  or `/about` footer.
- Soft launch — 5 friends, iterate on tone for 2 weeks.

**Risk:** Low (infrastructure ready). External dependency: DNS.

---

## Phase 22 — NFL Season Build (August 2026)

**Goal:** stand up NFL as the third moment ahead of season opener.

- Real NFL data layer (replacing scaffolding).
- Game detail surfaces for football.
- NFL-specific event taxonomy in push pipeline.
- NFL added to moment-grouped Follow picker as a live moment.

Spec: `docs/nfl-design.md`.

**Risk:** High — biggest feature build in the roadmap.

**Don't touch:** anything until ~5 weeks before season opener.

---

## Phase 23+ — Beyond

Sketched but unsequenced. Re-evaluate after Phase 22.

- Sports Circle visual prototype (4-hr time-boxed exploration).
- Path B follow-schema refactor (when a 3rd moment-tournament arrives).
- Multi-device push relay (phone + laptop + iPad).
- No-Spoilers Pro (extended-window hide rules, per-team hide).
- Family / shared follows.
- iOS Live Activities / native wrap.
- Champions League knockout rounds.

---

## Three things we deliberately don't do

These guardrails predate this roadmap and remain in force.

1. **Don't ship to the App Store yet.** PWA Add-to-Home-Screen is
   friction with a story; App Store distribution invites direct
   comparison with ESPN / Bleacher Report. Save it until user demand
   pulls for it.
2. **Don't add social / sharing / feed mechanics.** "Share this final
   score!" is the most natural-feeling feature to add and the most
   direct contradiction of the wedge.
3. **Don't position the brand on No-Spoilers alone.** No-Spoilers is a
   first-class feature, never the whole pitch. The product is a calm
   personalized sports companion.

---

## Legacy notes

Earlier roadmap revisions (Phase 0 friends-test, Phase 1 polish, Phase
2 reliability, Phase 2.6 tournament overview, Phase 3 NFL) lived in
`docs/roadmap/*.md`. They have been superseded by this file. The work
they described has either shipped (notifications, tournament overview,
NFL scaffolding) or been folded into the phase list above.
