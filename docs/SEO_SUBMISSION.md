# SEO submission guide — No Noise Scores

Step-by-step for getting `nonoisescores.app` indexed by Google, Bing,
and AI-search engines (ChatGPT, Claude, Perplexity). 15–30 minutes
total.

The technical scaffolding is already in place — `robots.txt`,
`sitemap.xml`, JSON-LD structured data, per-route metadata, OG image.
This guide is the part you have to click through.

---

## What's already done in code

You can confirm any of these by hitting the URL directly:

- `https://nonoisescores.app/robots.txt` — allow-list for Googlebot,
  Bingbot, OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot. Disallows
  user-state routes (`/watching`, `/following/*`, `/brief/*`, etc.). Also
  blocks training-only crawlers (GPTBot, anthropic-ai, CCBot).
- `https://nonoisescores.app/sitemap.xml` — 17 public routes with
  priorities.
- `https://nonoisescores.app/opengraph-image` — dynamically generated
  cream-on-ink share image, served from `app/opengraph-image.tsx`.
- JSON-LD structured data on the landing — `Organization`,
  `WebApplication`, `FAQPage` schemas. View source on `/` and search
  for `application/ld+json` to confirm.
- `noindex` on stateful routes — they won't show up in search results
  even if a link leaks.

---

## Step 1 — Google Search Console (10 min)

The most important one. Without this Google doesn't know your site
exists; with it, Google starts crawling within a few days.

1. Go to https://search.google.com/search-console
2. Sign in with the Google account you want tied to the site.
3. Click **Add property** → choose **URL prefix** (not Domain).
4. Enter `https://nonoisescores.app` and continue.
5. Pick **HTML tag** as the verification method. Google gives you a
   meta tag like:
   ```html
   <meta name="google-site-verification" content="abc123…" />
   ```
6. Copy the `content` value (the random string).
7. Open `app/layout.tsx` and add inside the `metadata` export:
   ```ts
   verification: {
     google: "abc123…",
   },
   ```
8. Commit + deploy. Wait for Vercel to finish.
9. Back in Search Console, click **Verify**.
10. Once verified, click **Sitemaps** in the left nav and submit:
    ```
    https://nonoisescores.app/sitemap.xml
    ```

Google starts crawling within 1–3 days. The "Coverage" report shows
which pages got indexed.

---

## Step 2 — Bing Webmaster Tools (5 min)

Bing powers DuckDuckGo, Yahoo, and ChatGPT Search. Worth submitting.

1. Go to https://www.bing.com/webmasters
2. Sign in with a Microsoft account.
3. Click **Import from Google Search Console** — this carries over your
   Google verification automatically. Skip to step 5.
4. If you don't want to use Google import, add the site manually + use
   HTML tag verification (same flow as Google, add a Bing tag to
   `layout.tsx`):
   ```ts
   verification: {
     google: "...",
     other: { "msvalidate.01": "bing-verification-code" },
   },
   ```
5. Once verified, **Submit sitemap** → `https://nonoisescores.app/sitemap.xml`

---

## Step 3 — IndexNow (3 min, optional but nice)

IndexNow is a protocol Bing + Yandex support that lets you ping search
engines when content changes. Faster than waiting for a crawl. Free.

1. Generate a key — any 32-character hex string. From terminal:
   ```bash
   openssl rand -hex 16
   ```
2. Save that key. You'll need to host it at a specific URL.
3. Create `public/<your-key>.txt` containing just the key value:
   ```bash
   echo "<your-key>" > public/<your-key>.txt
   ```
4. Commit + deploy. Confirm the file is reachable at
   `https://nonoisescores.app/<your-key>.txt`.
5. When you ship a new content page, ping IndexNow:
   ```bash
   curl "https://api.indexnow.org/indexnow?url=https://nonoisescores.app/new-page&key=<your-key>"
   ```
   (One curl per URL. Or batch via POST — see indexnow.org docs.)

Not critical for v1 — the sitemap.xml gets re-crawled regularly anyway.

---

## Step 4 — AI search engines

The big three AI search crawlers (Claude, ChatGPT, Perplexity) are
already allow-listed in `robots.txt`. They don't have a submission form
the way Google does — they discover sites organically via the broader
web crawl.

**To help them find you:**

1. Get the site linked from at least one well-indexed domain (a
   Twitter/X post, a Hacker News mention, a friend's blog). Just one
   inbound link bootstraps discovery.
2. The JSON-LD `Organization` + `WebApplication` + `FAQPage` schemas on
   the landing page give them clean structured data to cite.
3. The FAQ on `/` is the most likely surface to get lifted into a
   "People also ask"-style answer. Keep those answers honest and short.

**To verify they've found you (1–2 weeks after launch):**

- Search "No Noise Scores" in ChatGPT (logged in, with web search
  enabled).
- Search the same in Perplexity.
- Search in Claude with web tools enabled.

If none of them know the site after 2 weeks of public access, post one
link from any indexed account (Twitter/X, Mastodon, a personal blog) and
wait another week.

---

## Step 5 — Check what's indexed (ongoing)

Once Google Search Console verification is done:

- **Coverage report** shows pages indexed vs. excluded.
- **Performance** shows what queries surfaced your site (post-launch).
- **URL inspection tool** lets you manually request indexing for a
  specific URL. Useful when shipping a new page you want indexed fast.

---

## Skip list — what NOT to do

- **Don't buy backlinks.** They get penalized.
- **Don't put hidden keyword text anywhere.** Cloaking gets penalized.
- **Don't submit comparison pages to AI search engines as "this app
  is better than X."** Honest comparisons rank organically. Marketing
  prompts read as spam.
- **Don't request indexing for `/watching` or `/following`.** They're
  already `noindex` for a reason (user state).

---

## Quick reference — verification meta tag

When you have your Google verification code, drop it into the
`metadata` export at the top of `app/layout.tsx`:

```ts
export const metadata: Metadata = {
  // ...existing fields...
  verification: {
    google: "your-google-verification-code-here",
    // Add Bing later if you skip the Google import:
    // other: { "msvalidate.01": "your-bing-code-here" },
  },
};
```

Commit, deploy, verify in Search Console.

---

## When to come back to this

- **After friend beta launches** — submit sitemap once the site is
  stable and you're confident the content pages won't shift much.
- **Whenever a new content page ships** — request indexing in Search
  Console's URL inspector for that specific URL, or rely on the
  next scheduled re-crawl (usually a few days).
- **Quarterly** — check the Coverage report for excluded pages and
  fix anything unintentionally blocked.
