# Claude design prompt — Instagram launch set (v2)

Paste the brief below to a fresh design Claude session (Sonnet 4.5 or
Opus). The prompt is fully self-contained — Claude won't have access
to the repo or your earlier conversation, so everything it needs to
render the visuals is here.

This is the **v2** prompt with the following changes from v1:

- Stricter font specs so Bricolage Grotesque renders **condensed
  heavy** (not default-width). The v1 outputs ended up in
  Helvetica because the fallback chain wasn't tight enough.
- Three atmospheric texture options (A/B/C) to humanize the renders
  and signal "the noise being filtered out." Ask the design Claude
  to produce **each variant** for the feed post and stories 2 and
  4 so you can compare.
- Tighter "do not do" rules so the texture stays at low opacity
  and doesn't break the editorial calm.

Deliverables:

1. **One feed post** (1080×1350) — render three variants (A, B, C).
2. **One story carousel** (1080×1920, six stories) — render Stories
   1, 3, 5, 6 once. Render Stories 2 and 4 in all three variants
   (A, B, C) so you can compare the texture treatment.

---

# THE PROMPT — copy from here

You are designing a launch Instagram set for **No Noise Scores**, an
iOS app I just shipped to the App Store. Render the visuals as
high-fidelity image previews I can save and post. The brand and voice
are tightly locked — read every line below before generating
anything. If something contradicts these rules, the rules win.

## What No Noise Scores is

A calm sports companion built for the moments that matter — the NBA
Playoffs and the FIFA World Cup 2026. The user picks teams,
countries, series, or whole tournaments. The app shows scores,
calm alerts, and recaps for what they follow. Nothing else. No
feeds, no ads, no betting, no fantasy.

The product is positioned as the **opposite of every other sports
app**. Where ESPN is loud and pushes you content, No Noise is quiet
and lets you choose.

## Positioning lines (locked — do not paraphrase)

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App Store subtitle:** Scores and recaps. No noise.

Three things the brand says:

1. You're in control of what you see.
2. No feeds. No ads. No noise.
3. Built for the moments that matter — NBA Playoffs, FIFA World Cup.

Three things the brand never says (do not use these even sarcastically):

- "Trending now."
- "Top stories."
- "Don't miss out."

Voice principles:

- Plain, simple, chill. Not presumptuous, not sensational.
- **No em-dashes in any user-facing copy.** Use periods, commas, or
  parentheses.
- No "we don't just X, we Y" rhythm.
- No marketing inflation. "A calm sports companion" works because
  it's the locked positioning, not flourish.

## Visual identity (strict)

### Palette

- **Cream (background):** `#f1ead8`
- **Dark ink (primary text):** `#1a1612`
- **Ink-2 (secondary text):** `#4a4030`
- **Mute (tertiary text):** `#6f6552`
- **Rust orange (accent):** `#e55b2a`
- **Forest green (secondary accent, World Cup only):** `#3a6b4a`
- **Hairline border:** `#ddd2ba`

### Type — CRITICAL, read carefully

Earlier renders defaulted to Helvetica/Inter and lost the brand
character. Lock the type stack like this:

**Display headlines** (the big "Follow what matters. Skip the rest."
or "Calm by default." lines):

- Font: **Bricolage Grotesque**
- This is a **variable font with a width axis (wdth)**.
- Use it at **wdth 75–85 (condensed)** and **weight 700–800
  (heavy)**. The default width (100) is too wide and reads as
  generic — do not use it.
- Available from Google Fonts.
- Fallback chain if Bricolage Grotesque isn't available in your
  rendering environment: **Druk Wide Bold** → **PP Editorial New
  Heavy Italic** → **Termina Heavy** → **Anton** → **Oswald
  ExtraBold**. Do NOT fall back to Helvetica, Inter, SF Pro, or
  any default system sans — those have no brand character and the
  whole point is the condensed-heavy display look.

**Body / subtitle / small descriptive text** (like "The games you
follow. Nothing else." or "A calm sports companion for the moments
that matter."):

- Font: **Inter**
- Weight: **500, 600, or 700**
- Tracking: ~0 (normal)

**Eyebrows / labels / numbers / dates / "ON THE APP STORE" / "MAY
2026" / app screen mono labels**:

- Font: **JetBrains Mono**
- Weight: **600 (semibold) or 700 (bold)**
- ALL UPPERCASE for labels
- Letterspacing: ~1.0–1.5 tracking
- Available from Google Fonts.

**Render check:** if your output uses Helvetica, Arial, Inter Bold,
or SF Pro for the big display headlines, the render is wrong. Try
again with the condensed-heavy Bricolage or its fallback chain.

### Feel

- Calm, premium, mobile-first, editorial, uncluttered.
- Cream is the canvas. Dark ink for headlines. Rust orange only as
  an accent (pip, eyebrow, hairline). Green only for World Cup
  contexts.
- No gradients. No drop shadows beyond a soft 0–4px ambient under
  cards. No glow effects. No emoji.
- Lots of negative space. Editorial rhythm, not SaaS marketing.

### The No Noise mark

A small dark-ink chip with a cream pill inside and a rust pip on
the right. Render at small size (16–24px), always lockup-left of
the wordmark when used together.

## Atmospheric texture — render three variants (A, B, C)

To humanize the renders and signal what the app filters out, you
will add a single monochromatic atmospheric texture behind the
headline. This texture represents **the noise** the user escapes
when they open the app. The calm cream "wins" the center of the
canvas; the texture sits at the edges and fades inward.

Render the feed post AND stories 2 and 4 in three variants — A, B,
and C — using these three texture treatments. Label each variant
clearly (e.g. "Feed post — Variant A," "Story 2 — Variant B," etc).

### Variant A — Faded arena silhouette

A monochromatic dark-ink silhouette of a stadium interior
(architectural — seating bowl, scoreboard structure, support
columns) rendered as if seen through fog. No identifiable people.
No faces. No hands. No team logos. Just architecture.

- Opacity: 8–12% max.
- Color: dark ink (`#1a1612`) only, monochrome.
- Placement: bleeds in from the top and bottom edges of the
  canvas, fades to fully transparent in the center 60% of the
  canvas where the headline and phone sit.
- Style: architectural illustration / etched / engraved feel.
  Not photographic. Not realistic crowd photography.

The metaphor: "the noise is out there, this is the quiet inside
it."

### Variant B — Sound-wave decay

A horizontal band of compressed audio waveform across the bottom
third of the canvas. The waveform is busy and chaotic at the left
and right edges, decaying to a flat line in the middle where the
center column of the layout sits.

- Opacity: 12–18% (slightly higher than Variant A because it's
  more abstract).
- Color: dark ink (`#1a1612`) only.
- Style: thin lines, 1–2px each, vertically-stacked waveform bars
  varying in height by chaotic noise → smoothing to silence.
- Placement: ~bottom third of the canvas, behind everything.

The metaphor: "noise decaying to silence."

### Variant C — Generated scoreboard glyph texture

A repeating, very faint pattern of generated scoreboard-style
characters — numerals, segmented LED-style digits, ALL CAPS letters
in monospace — tiled across the entire canvas, dramatically faded
where the phone or main copy sits.

- Opacity: 6–10% max (very subtle).
- Color: dark ink (`#1a1612`) only.
- Glyphs: a mix of "0–9", common scoreboard abbreviations ("Q1",
  "Q2", "FINAL", "OT", "HT", "FT", "MIN", "PTS", "GOAL"), no
  meaningful sequence.
- Placement: tiled background, with a radial fade-to-cream from
  the center so the calm zone is clear.

The metaphor: "the scoreboard text everywhere, dissolved away."

### Texture rules that apply to ALL THREE variants

NEVER cross these lines:

- No identifiable people, faces, hands, or human silhouettes.
- No real-world photography of any kind. No stock b-roll.
- No team logos, brand marks, jerseys, or league marks.
- No high-contrast or saturated textures — monochrome dark ink
  only, low opacity.
- No motion blur, glow, or neon effects.
- If the texture is louder than the calm zone, it's wrong. The
  cream center must "win." A viewer should see the calm first and
  the texture second.

If you can't render a variant within these rules, render that
variant without the texture (clean cream canvas) and note that
the texture wasn't achievable. Don't fake it with anything
photographic.

## Product context for the visuals

You'll be asked to embed app screenshots inside a phone frame in
several stories. Describe what's on the screen with this detail:

- **Today screen:** Eyebrow "TODAY" in rust. Headline "One game
  tonight." in heavy ink (Bricolage condensed). A pinned game card
  with a rust accent strip on the left, showing "PINNED · NBA ·
  TONIGHT", "SA vs OKC", "8:00 PM · Game 7", "NBC" broadcast pill.
  Below: "QUIET WRAP" eyebrow with a recap card. Bottom: tab nav
  (Today / Following / Watching), Today is active in rust.
- **Following screen:** Headline "Your sports circle." Two
  tournament rows: NBA Playoffs (rust accent) and FIFA World Cup
  2026 (green accent). Each has a small avatar chip (NBA / WC) on
  the left, tournament name, "Best-of-7 series · East and West"
  or "48 nations · group stage through the final", a bell icon on
  the right.
- **Lock screen with Live Activity:** iOS lock screen mock,
  showing the time (9:41), then the Live Activity pinned panel:
  cream card, two team blocks (SA and OKC), a center bug with
  score ("78 - 65"), period text ("Q3 · 4:21"), a thin progress
  rail underneath. The team that's ahead gets a tiny rust pip
  next to their score. Top-right of the card: small rust "● LIVE"
  label.
- **Home screen with widget:** iPhone home screen, dark wallpaper
  (default iOS), Weather widget at top. The No Noise widget is a
  medium-size tile that shows "NBA · TONIGHT" eyebrow in rust,
  "SA vs OKC" headline, "8:00 PM · Game 7" detail line, "NBC"
  broadcast pill. The widget label below it reads "No Noise
  Scores." Surrounded by typical iOS app icons.

## DELIVERABLE 1: Feed post — render Variants A, B, C (1080×1350 each)

A single hero tile. Cream canvas. Render three versions — one per
texture variant — so I can compare.

Composition (same for all three variants, only the texture
changes):

- Top quarter: small No Noise mark (chip + wordmark "No Noise
  Scores"), centered, in dark ink.
- Middle: a phone frame at slight 0–3° tilt showing the Today
  screen described above. The phone takes up about 55% of the
  vertical canvas.
- Below the phone: a single eyebrow line in JetBrains Mono
  uppercase rust: "ON THE APP STORE."
- Below that: a heavy display headline in **Bricolage Grotesque
  condensed heavy** (wdth 75–85, weight 700–800), dark ink:
  "Follow what matters. Skip the rest." — two lines, very big.
- Bottom margin: small footer in mute JetBrains Mono:
  "nonoisescores.app".

Label each output: "Feed Post — Variant A (Stadium Silhouette),"
"Feed Post — Variant B (Sound Wave Decay)," "Feed Post — Variant C
(Scoreboard Glyph Texture)."

No CTAs, no "Download Now," no arrows. The image is the pitch.
Calm beats loud.

## DELIVERABLE 2: Story carousel (1080×1920 each, six stories)

Six vertical 9:16 stories that scroll as a connected set. Each one
is its own complete image with one idea. Cream canvas, dark ink
text, rust as accent only.

Stories 1, 3, 5, 6 are rendered **once each** (no texture
variants needed — these are either text-only or product-screen
heavy and the textures would compete).

Stories 2 and 4 are rendered **in all three variants (A, B, C)**.
Label each variant: "Story 2 — Variant A," "Story 2 — Variant B,"
etc.

### Story 1 — The announcement

- Top: small No Noise mark.
- Middle: very large display headline in Bricolage Grotesque
  condensed heavy, dark ink, two lines: "We're live." (line 1)
  and "On the App Store today." (line 2).
- Below: a single mono uppercase eyebrow rust: "MAY 2026."
- Bottom: footer "nonoisescores.app".
- **No atmospheric texture.** Text-only canvas.

### Story 2 — The positioning (3 variants: A, B, C)

- Top: mono eyebrow rust "WHY IT EXISTS".
- Middle: heavy display headline ink in Bricolage Grotesque
  condensed heavy, three short lines: "No feeds." / "No ads." /
  "No noise."
- Below: a single line, smaller ink-2 body in Inter: "A calm
  sports companion for the moments that matter."
- Bottom: footer.
- **Atmospheric texture: render once per variant (A, B, C).**

### Story 3 — Today screen showcase

- Top: mono eyebrow rust "TODAY".
- Middle-upper: a heavy display headline ink in Bricolage
  Grotesque condensed: "Calm by default."
- Middle: phone frame tilted 0–3°, Today screen rendered as
  described.
- Bottom: small mono ink-2 line: "The games you follow. Nothing
  else."
- Footer.
- **No atmospheric texture.** The product screen IS the focus.

### Story 4 — Live Activity showcase (3 variants: A, B, C)

- Top: mono eyebrow rust "LIVE ACTIVITIES".
- Middle-upper: heavy display ink headline: "On your lock
  screen."
- Middle: a lock-screen mock as described, the Live Activity
  panel showing SA vs OKC live with progress rail.
- Bottom: small mono ink-2 line: "Quiet ink for the team behind.
  Rust pip for the team ahead."
- Footer.
- **Atmospheric texture: render once per variant (A, B, C).** The
  lock screen sits on a dark wallpaper anyway, so the texture
  fades into the cream margins around it.

### Story 5 — Sports circle showcase

- Top: mono eyebrow rust "FOLLOWING".
- Middle-upper: heavy display ink headline: "Your sports
  circle."
- Middle: phone frame tilted, Following screen rendered as
  described, both tournament rows visible.
- Bottom: small mono ink-2 line: "Pick teams, countries, series,
  whole tournaments."
- Footer.
- **No atmospheric texture.**

### Story 6 — The CTA (calm version)

- Top: small No Noise mark.
- Middle: heavy display ink in Bricolage Grotesque condensed
  heavy, two lines: "On the App Store" / "today."
- Below: a single mono uppercase rust eyebrow: "FREE."
- Bottom: footer "nonoisescores.app · @nonoisescores".
- **No atmospheric texture.** Closing slide is clean.

For Story 6, do not add download badges or pressure language. The
calm CTA is the brand voice.

## Things to absolutely not do

- Don't use the word "trending," "top stories," or "don't miss
  out" anywhere.
- Don't use em-dashes in copy. Periods, commas, or parentheses.
- Don't add team logos. The app intentionally uses team
  abbreviations (SA, OKC, NYK) to avoid licensing — keep that
  consistent.
- Don't add fictional star ratings or "1M downloads" social
  proof. The product is new.
- Don't add countdown timers, urgency badges, or sale callouts.
- Don't render any face or human figure. The brand is the
  product, not a person.
- Don't use a gradient background or auto-flip to dark mode.
  Cream cream cream.
- Don't add stock photo b-roll of crowds, balls, or players.
- Don't fall back to Helvetica, Arial, Inter, or SF Pro for the
  display headlines — use the Bricolage Grotesque fallback chain
  if Bricolage itself isn't available.
- Don't let the atmospheric texture exceed 12% opacity or invade
  the calm center zone.

## Output format

For each deliverable, render the image at its target resolution.
If the platform can't render a 1080×1920 image directly, render
at 720×1280 with a note that the final output should be scaled at
upload time.

Label every output clearly so I can compare variants:

- "Feed Post — Variant A (Stadium Silhouette)"
- "Feed Post — Variant B (Sound Wave Decay)"
- "Feed Post — Variant C (Scoreboard Glyph Texture)"
- "Story 1 — Announcement"
- "Story 2 — Variant A / B / C"
- "Story 3 — Today Screen"
- "Story 4 — Variant A / B / C"
- "Story 5 — Following Screen"
- "Story 6 — CTA"

Total: **3 feed posts** + **10 story slides** (4 single + 6
variants) = **13 images**.

Caption the feed post with a tight 1–2 sentence Instagram caption
that matches the voice. No hashtags, no emoji. The story set does
not need captions.

Begin.
