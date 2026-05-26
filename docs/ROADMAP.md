# No Noise Scores — Roadmap

This file lists the work ahead, sequenced.

**Phases 1–8, A/B/C, 9–20, the QA bug round, the polish batch, and
the copy + tone sweep are all complete** (see
`app/CHANGELOG_PRODUCT.md` for per-phase detail).

Each phase below is one go/no-go unit. Do not jump ahead.

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

## ✅ Phases 9–20 — SHIPPED (May 2026)

The full friend-beta + desktop landing + SEO content layer + in-app
polish push. See `app/CHANGELOG_PRODUCT.md` for the per-phase detail.
At a glance:

- Phase 9 — Friend Beta Gate
- Phase 10 — Web route architecture split (`/` responsive, `/app` route)
- Phase 11 — Desktop landing shell
- Phase 12 — SEO foundation (robots, sitemap, JSON-LD)
- Phase 13 — Core content pages (about / privacy / changelog / beta)
- Phase 14 — Feature pages (manifesto set)
- Phase 15 — Guide pages
- Phase 16 — Comparison + niche capture pages
- Phase 17 — Following = Sports Circle
- Phase 18 — Watching deepening
- Phase 19 — Dark mode (warm dark)
- Phase 20 — Retention plumbing

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
