/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { APP_STORE_URL } from "../../lib/app-store";

// Landing hero — the first thing a desktop visitor sees.
//
// Left column: positioning copy, open/install CTAs, microcopy. Locked
// language per AGENTS.md — "A calm sports companion for the moments
// that matter." / "Follow what matters. Skip the rest."
//
// Right column: a phone-sized visual snapshot of the Today screen so
// the user can see what they're being asked to install. Static visual
// (not a live render) — it has to look right in screenshots and on
// crawlers' first paint, so we don't depend on client hydration.

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Signature: the firehose, hushed. The calm message cuts through it. */}
      <NoiseField />

      <div
        className="relative mx-auto grid items-center gap-12 px-8 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-12 md:py-28 lg:gap-16 lg:px-20"
        style={{ maxWidth: 1280 }}
      >
        {/* ── Left: the statement ───────────────────────────────────────── */}
        <div className="flex flex-col justify-center">
          <p
            className="nns-hero-rise mb-5 text-[0.6875rem] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              color: "var(--mute-1)",
              fontWeight: 700,
            }}
          >
            NFL Season · NBA Playoffs · Summer Soccer 2026
          </p>

          {/* The tagline as the hero statement; the type enacts it — "Skip the
              rest." recedes into mute, the way the noise should. */}
          <h1
            className="nns-hero-rise-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(46px, 7vw, 92px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 0.96,
              color: "var(--ink)",
            }}
          >
            Follow what matters.
            <br />
            <span style={{ color: "var(--mute-2)" }}>Skip the rest.</span>
          </h1>

          <p
            className="nns-hero-rise-3 mt-6 max-w-[44ch] text-[1.125rem] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            A calm sports companion for the moments that matter. Scores, alerts,
            and recaps for the teams, countries, series, and tournaments you
            care about.
          </p>

          {/* CTAs — the browser app is the primary on desktop (it works right
              here); "Get the app" opens the App Store listing, and the QR card
              below is the phone bridge for scanning. The friend-beta button
              retired once the app shipped on the App Store. */}
          <div className="nns-hero-rise-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[0.875rem] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
              }}
            >
              Open in browser
            </Link>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[0.875rem] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              Get the app
            </a>
          </div>

          {/* QR bridge — a desktop visitor scans to land the iPhone app on
              their phone, where the lock-screen alerts actually live. */}
          <div
            className="nns-hero-rise-4 mt-6 flex items-center gap-4 rounded-[16px] border p-4"
            style={{ background: "var(--paper)", borderColor: "var(--line)", maxWidth: 380 }}
          >
            <img
              src="/app-store-qr.svg"
              alt="Scan to download No Noise Scores on the App Store"
              width={88}
              height={88}
              style={{ borderRadius: 10, display: "block" }}
            />
            <div className="min-w-0">
              <p
                className="text-[0.625rem] uppercase"
                style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--mute-1)" }}
              >
                On your iPhone
              </p>
              <p className="mt-0.5 text-[0.875rem] leading-snug" style={{ color: "var(--ink)", fontWeight: 600 }}>
                Scan to get it on the App Store.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener"
                className="mt-1 inline-block text-[0.75rem]"
                style={{ color: "var(--mute-1)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Or open the App Store →
              </a>
            </div>
          </div>

          <p
            className="nns-hero-rise-4 mt-5 text-[0.8125rem] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            On iPhone, scan the code to install. On Android or desktop, open it
            in any browser. Your sports circle syncs with a code.
          </p>
        </div>

        {/* ── Right: the signal — the calm artifact amid the noise ──────── */}
        <div className="nns-hero-rise-4 flex items-center justify-center">
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}

// NoiseField — the one bold idea. A faint mono whisper of everything No Noise
// Scores silences: live tickers, "BREAKING", and the feed words the brand
// rejects ("TRENDING", "TOP STORY"), quieted to the edges. A radial cream wash
// clears them behind the message so calm visibly emerges from the firehose.
// Decorative + aria-hidden; settles in on load (reduced-motion: static).
function NoiseField() {
  const row =
    "LAL 112 · DEN 108      GOAL · BRA 67'      BREAKING      Q4 2:14      TRENDING NOW      FINAL      10 NEW ALERTS      TOP STORY      ARG 2 · CHI 1      LIVE 89'      HALFTIME      5 NOTIFICATIONS      UPSET ALERT      ";
  const base = {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--mute-2)",
    whiteSpace: "nowrap" as const,
  };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Rows sit BELOW the eyebrow band (the eyebrow stays in clean cream up
          top) and are hushed low so the message always wins. The firehose
          reads behind the headline + the phone, never over the labels. */}
      <p className="nns-hero-noise absolute left-0 right-0" style={{ ...base, top: "31%", fontSize: 28, opacity: 0.09, filter: "blur(0.5px)" }}>
        {row}{row}
      </p>
      <p className="nns-hero-noise absolute left-0 right-0" style={{ ...base, top: "56%", fontSize: "1.375rem", opacity: 0.07, filter: "blur(0.6px)", transform: "translateX(-130px)" }}>
        {row}{row}
      </p>
      <p className="nns-hero-noise absolute left-0 right-0" style={{ ...base, top: "81%", fontSize: 25, opacity: 0.08, filter: "blur(0.5px)", transform: "translateX(-60px)" }}>
        {row}{row}
      </p>
      {/* Cream wash — keeps the whole message column (eyebrow → CTAs) clean;
          the noise resolves behind the phone + lower edges. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(125% 95% at 22% 48%, var(--cream) 48%, transparent 84%)" }}
      />
    </div>
  );
}

// ── Phone preview ───────────────────────────────────────────────────────
// Static visual of the Today screen for someone following the Lions, the
// Chiefs and the Ravens. Not a live render — this is the marketing
// surface; consistency matters more than realtime data. Crawlers see this
// without hydrating the app.
//
// Every number is real, not invented (data-integrity rule). It is one
// recorded moment, Sunday Sep 27 2026 at 3:55 PM ET, Week 3:
// scripts/fixtures/nfl-week3-2026-live-0927-1555et.json — the same moment
// the v1.0.4 store screenshots use. NYJ 24 at DET 31, Q4 0:51 on FOX (the
// lead), KC 24 at MIA 10, Q4 1:42 on CBS (also live), and BAL at DAL
// kicking off at 4:25 PM on CBS. The clock, the live games and the next
// kickoff agree with each other, and the caption under the phone says it
// is an example with real scores, so nobody reads it as live.

const PREVIEW_MOMENT = {
  clock: "Sun 3:55 PM",
  caption: ["Example screen.", "Real scores from Sep 27, 3:55 PM ET."],
  live: {
    headline: "Lions are live.",
    matchup: "NYJ · DET",
    score: "24-31",
    status: "Q4 0:51 · FOX",
  },
  alsoLive: {
    matchup: "KC · MIA",
    score: "24-10",
    status: "Q4 1:42 · CBS",
  },
  follows: [
    { code: "DET", live: true },
    { code: "KC", live: true },
    { code: "BAL", live: false },
  ],
  next: {
    matchup: "BAL at DAL",
    detail: "Week 3 · 4:25 PM · CBS",
  },
} as const;

function PhonePreview() {
  return (
    <figure className="flex flex-col items-center">
      <div
        className="relative"
        style={{
          width: 340,
          height: 720,
          borderRadius: 44,
          background: "var(--ink)",
          padding: 12,
          boxShadow:
            "0 30px 60px -20px rgba(20, 15, 8, 0.25), 0 12px 24px -12px rgba(20, 15, 8, 0.15)",
        }}
        aria-label="No Noise Scores app preview"
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden"
          style={{
            background: "var(--cream)",
            borderRadius: 32,
          }}
        >
          {/* Scrollable content area — pads to leave room for tab bar */}
          <div
            className="flex-1 overflow-hidden"
            style={{ padding: "20px 16px 0" }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                Today
              </p>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "var(--mute-1)",
                  textTransform: "uppercase",
                }}
              >
                {PREVIEW_MOMENT.clock}
              </span>
            </div>

            {/* Worth checking now — the live lead */}
            <div
              className="mb-3 rounded-[12px] border px-3 py-3"
              style={{
                background: "var(--nfl-soft)",
                borderColor: "var(--line)",
                borderLeft: "3px solid var(--nfl)",
              }}
            >
              <p
                className="text-[0.625rem] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--nfl)",
                }}
              >
                Worth checking now
              </p>
              <p
                className="mt-1 leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.125rem",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                {PREVIEW_MOMENT.live.headline}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--mute-1)",
                    textTransform: "uppercase",
                  }}
                >
                  {PREVIEW_MOMENT.live.matchup}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {PREVIEW_MOMENT.live.score}
                </span>
              </div>
              <p
                className="mt-1 flex items-center gap-1.5 text-[0.625rem] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--mute-1)",
                }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--live)" }}
                />
                {PREVIEW_MOMENT.live.status}
              </p>
            </div>

            {/* Also live — the second followed game that's on right now */}
            <p
              className="mb-1 text-[0.625rem] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
              }}
            >
              Also live
            </p>
            <div
              className="mb-3 flex items-baseline justify-between gap-2 rounded-[12px] border px-3 py-2.5"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <span className="flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--mute-1)",
                  }}
                >
                  {PREVIEW_MOMENT.alsoLive.matchup}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {PREVIEW_MOMENT.alsoLive.score}
                </span>
              </span>
              <span
                className="flex items-center gap-1.5 text-[0.625rem] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--mute-1)",
                }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--live)" }}
                />
                {PREVIEW_MOMENT.alsoLive.status}
              </span>
            </div>

            {/* You Follow */}
            <p
              className="mb-1 text-[0.625rem] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
              }}
            >
              You follow
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PREVIEW_MOMENT.follows.map((c) => (
                <span
                  key={c.code}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                  style={{
                    background: c.live ? "var(--nfl)" : "var(--cream-2)",
                    color: c.live ? "var(--cream)" : "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {c.live ? (
                    <span
                      aria-hidden
                      className="h-1 w-1 rounded-full"
                      style={{ background: "var(--cream)" }}
                    />
                  ) : null}
                  {c.code}
                </span>
              ))}
            </div>

            {/* Up next */}
            <p
              className="mb-1 text-[0.625rem] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
              }}
            >
              Up next
            </p>
            <div
              className="rounded-[12px] border px-3 py-2.5"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <p
                className="text-[0.75rem]"
                style={{ color: "var(--ink)", fontWeight: 700 }}
              >
                {PREVIEW_MOMENT.next.matchup}
              </p>
              <p
                className="mt-0.5 text-[0.6875rem]"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {PREVIEW_MOMENT.next.detail}
              </p>
            </div>

            {/* The Margin — Today's Brief prompt, in the app's own words. */}
            <div
              className="mt-3 rounded-[12px] border px-3 py-2.5"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <p
                className="text-[0.625rem] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--mute-1)",
                }}
              >
                The Margin
              </p>
              <p
                className="mt-0.5 text-[0.75rem] leading-snug"
                style={{ color: "var(--ink)", fontWeight: 600 }}
              >
                A calm morning recap of what your follows did.
              </p>
            </div>
          </div>
          {/* ── Bottom tab nav mockup — Today / Schedule / Following / Watching ── */}
          <PreviewTabBar />
        </div>
      </div>
      <figcaption
        className="mt-4 max-w-[340px] text-center text-[0.6875rem] leading-snug"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--mute-1)",
        }}
      >
        {PREVIEW_MOMENT.caption.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// PreviewTabBar — static mockup of the app's bottom tab navigation.
// Mirrors `app/companion/frame/TabBar.tsx`: four labels-only mono
// wordmarks (the icons retired 2026-07-03), Today active in full ink with
// the short brand tick under the word. Visual only; no navigation.

const PREVIEW_TABS = ["Today", "Schedule", "Following", "Watching"] as const;

function PreviewTabBar() {
  return (
    <nav
      aria-hidden
      className="flex shrink-0 items-stretch justify-around border-t px-2 pb-4 pt-2"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
      }}
    >
      {PREVIEW_TABS.map((label, idx) => {
        const active = idx === 0;
        return (
          <div
            key={label}
            className="flex flex-1 flex-col items-center gap-[5px] py-1"
            style={{ color: active ? "var(--ink)" : "var(--mute-1)" }}
          >
            <span
              className="uppercase"
              style={{
                fontFamily: "var(--font-display)",
                fontStretch: "var(--label-stretch)",
                fontSize: "0.5625rem",
                fontWeight: active ? 800 : 600,
                letterSpacing: "0.12em",
              }}
            >
              {label}
            </span>
            <span
              aria-hidden
              className="block h-[2px] w-4"
              style={{ background: active ? "var(--brand)" : "transparent" }}
            />
          </div>
        );
      })}
    </nav>
  );
}
