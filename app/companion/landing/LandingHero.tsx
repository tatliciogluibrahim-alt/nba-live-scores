/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { APP_STORE_URL } from "../../lib/app-store";

// Landing hero — the first thing a desktop visitor sees.
//
// Left column: positioning copy, install/beta CTAs, microcopy. Locked
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
            className="nns-hero-rise mb-5 text-[11px] uppercase"
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
            className="nns-hero-rise-3 mt-6 max-w-[44ch] text-[18px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            A calm sports companion for the moments that matter. Scores, alerts,
            and recaps for the teams, countries, series, and tournaments you
            care about.
          </p>

          {/* CTAs — on a DESKTOP browser the App Store button is a dead end
              (you can't tap it from your phone), so the primary action here is
              the browser app; the App Store path becomes the QR card below. */}
          <div className="nns-hero-rise-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[14px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
              }}
            >
              Open in browser
            </Link>
            <Link
              href="/beta"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[14px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              Join the friend beta
            </Link>
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
                className="text-[10px] uppercase"
                style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", color: "var(--mute-1)" }}
              >
                On your iPhone
              </p>
              <p className="mt-0.5 text-[14px] leading-snug" style={{ color: "var(--ink)", fontWeight: 600 }}>
                Scan to get it on the App Store.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener"
                className="mt-1 inline-block text-[12px]"
                style={{ color: "var(--mute-1)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Or open the App Store →
              </a>
            </div>
          </div>

          <p
            className="nns-hero-rise-4 mt-5 text-[13px] leading-snug"
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
    "LAL 112 · DEN 108      GOAL — BRA 67'      BREAKING      Q4 2:14      TRENDING NOW      FINAL      10 NEW ALERTS      TOP STORY      ARG 2 · CHI 1      LIVE 89'      HALFTIME      5 NOTIFICATIONS      UPSET ALERT      ";
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
      <p className="nns-hero-noise absolute left-0 right-0" style={{ ...base, top: "56%", fontSize: 22, opacity: 0.07, filter: "blur(0.6px)", transform: "translateX(-130px)" }}>
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
// Static visual of the Today screen as it would render with one followed
// team + one pinned game. Not a live render — this is the marketing
// surface; consistency matters more than realtime data. Crawlers see
// this without hydrating the app.

function PhonePreview() {
  return (
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
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "var(--mute-1)",
              textTransform: "uppercase",
            }}
          >
            8:14 PM
          </span>
        </div>

        {/* Brief */}
        <div
          className="mb-3 rounded-[12px] border px-3 py-2.5"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
          }}
        >
          <p
            className="text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--mute-1)",
            }}
          >
            Brief
          </p>
          <p
            className="mt-1 text-[13px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Your team plays tonight. NE at SEA, 8:20 PM.
          </p>
        </div>

        {/* Worth checking now hero */}
        <div
          className="mb-3 rounded-[12px] border px-3 py-3"
          style={{
            background: "var(--nba-soft)",
            borderColor: "var(--line)",
            borderLeft: "3px solid var(--nba)",
          }}
        >
          <p
            className="text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--nba)",
            }}
          >
            Worth checking now
          </p>
          <p
            className="mt-1 leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            Seahawks are live.
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--mute-1)",
                textTransform: "uppercase",
              }}
            >
              NE · SEA
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 800,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              17-24
            </span>
          </div>
        </div>

        {/* You Follow */}
        <p
          className="mb-1 text-[10px] uppercase"
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
          {[
            { code: "SEA", live: true },
            { code: "KC", live: false },
            { code: "DET", live: false },
          ].map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{
                background: c.live ? "var(--nba)" : "var(--cream-2)",
                color: c.live ? "var(--cream)" : "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
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
          className="mb-1 text-[10px] uppercase"
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
            className="text-[12px]"
            style={{ color: "var(--ink)", fontWeight: 700 }}
          >
            TB at CIN
          </p>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Week 1 · Sun 1:00 PM · FOX
          </p>
        </div>

        {/* Reminder row — the third sport, framed as the upcoming moment. */}
        <div
          className="mt-3 rounded-[12px] px-3 py-2"
          style={{
            background: "var(--nfl-soft)",
          }}
        >
          <p
            className="text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--nfl)",
            }}
          >
            The Margin
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Your morning brief. Quiet by design.
          </p>
        </div>
        </div>
        {/* ── Bottom tab nav mockup — Today / Following / Watching ───── */}
        <PreviewTabBar />
      </div>
    </div>
  );
}

// PreviewTabBar — static mockup of the app's bottom tab navigation.
// Mirrors `app/companion/frame/TabBar.tsx` with Today active. Visual
// only; no navigation. The 3-tab IA is core product — showing it on
// the landing makes the structure obvious in five seconds.

function PreviewTabBar() {
  return (
    <nav
      aria-hidden
      className="flex shrink-0 items-stretch justify-around border-t px-3 pb-3 pt-2"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
      }}
    >
      <TabSlot label="Today" active icon={<TabSunIcon />} />
      <TabSlot label="Schedule" icon={<TabGridIcon />} />
      <TabSlot label="Following" icon={<TabHeartIcon />} />
      <TabSlot label="Watching" icon={<TabPinIcon />} />
    </nav>
  );
}

function TabSlot({
  label,
  active = false,
  icon,
}: {
  label: string;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="relative flex flex-1 flex-col items-center gap-1 px-2 py-1"
      style={{
        color: active ? "var(--ink)" : "var(--mute-1)",
        opacity: active ? 1 : 0.85,
      }}
    >
      {/* Active indicator — 3px ink pill above icon */}
      <span
        aria-hidden
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
        style={{
          width: active ? 18 : 0,
          height: 3,
          background: "var(--ink)",
        }}
      />
      {icon}
      <span
        className="text-[9px] uppercase"
        style={{
          fontWeight: active ? 800 : 600,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// SVG icons mirror the real TabBar (Today = sun, Following = heart,
// Watching = pin). Sized 16px to fit the smaller mockup.

function TabSunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function TabGridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function TabHeartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function TabPinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 17v5" />
      <path d="M9 10.76A2 2 0 0 1 8 9V4h8v5a2 2 0 0 1-1 1.76l-1 .57V17H10v-5.67l-1-.57z" />
    </svg>
  );
}
