import Link from "next/link";
import { BrandMark } from "../frame/BrandMark";
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
    <section
      className="mx-auto grid gap-12 px-8 py-16 md:grid-cols-2 md:px-12 md:py-24 lg:gap-16 lg:px-20"
      style={{ maxWidth: 1280 }}
    >
      {/* ── Left: positioning + CTAs ─────────────────────────────────── */}
      <div className="flex flex-col justify-center">
        {/* Brand lockup — BrandMark glyph + wordmark. Sized small so it
            reads as identity (not a hero element); the H1 below carries
            the editorial weight. */}
        <div className="mb-5 flex items-center gap-2.5">
          <BrandMark size={32} />
          <p
            className="text-[14px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "-0.005em",
              color: "var(--ink)",
            }}
          >
            No Noise Scores
          </p>
        </div>
        <h1
          className="leading-[1.05]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 5.5vw, 64px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          The calm sports companion.
        </h1>
        <p
          className="mt-5 max-w-[42ch] text-[18px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Follow what matters. Skip the rest. Scores, alerts, and recaps
          for the teams, countries, series, and tournaments you care
          about.
        </p>

        {/* CTAs — lead with the App Store (one-tap install on iPhone),
            then the browser/PWA path for Android + desktop, then beta. */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[14px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Download on the App Store
          </a>
          <Link
            href="/app"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[14px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
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

        <p
          className="mt-5 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          On iPhone, get it from the App Store. On Android or desktop, add
          it to your home screen for instant access to your sports circle.
        </p>

        {/* Tiny moments line */}
        <p
          className="mt-8 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            color: "var(--mute-2)",
            fontWeight: 600,
          }}
        >
          NBA · Summer Soccer 2026 · NFL coming
        </p>
      </div>

      {/* ── Right: phone-sized live preview snapshot ─────────────────── */}
      <div className="flex items-center justify-center">
        <PhonePreview />
      </div>
    </section>
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
            One pinned game is live. Knicks · Cavaliers.
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
            Knicks pulled ahead in Q4.
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
              NYK · CLE
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
              98-89
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
            { code: "NYK", live: true },
            { code: "USA", live: false },
            { code: "BRA", live: false },
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
            USA vs MEX
          </p>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Group A · Thu 8:00 PM · FOX
          </p>
        </div>

        {/* Reminder row */}
        <div
          className="mt-3 rounded-[12px] px-3 py-2"
          style={{
            background: "var(--wc-soft)",
          }}
        >
          <p
            className="text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--wc)",
            }}
          >
            Summer Soccer
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            16 days until first whistle.
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
