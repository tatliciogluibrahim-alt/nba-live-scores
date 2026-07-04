"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { useLiveRail } from "./use-live-rail";

// Desktop-only left sidebar nav. Mirrors the mobile TabBar (Today /
// Following / Watching) but laid out as a vertical rail with the
// brand lockup pinned at the top and Settings tucked at the bottom.
//
// Hidden below `md`. On mobile the bottom TabBar remains the primary
// nav surface; this rail replaces it at desktop widths. CompanionFrame
// reserves left padding (md:pl-[220px]) so the main column doesn't sit
// underneath the rail.
//
// System D (2026-07-04): the rail joins the editorial grammar. The
// generic line icons (sun / heart / pin / book / gear) are retired per
// the TabBar founder call — stock line icons read as AI iconography and
// the register carries better as pure type. Nav is labels-only mono
// wordmarks. The active entry is carried by the ink register plus a short
// vertical brand tick at the leading edge (the vertical analog of the
// TabBar's under-word tick). LIVE NOW is agate rows (mono codes +
// breathing dot), no soft pills. Vermilion appears only on the active
// tick, per the chrome law.

type Tab = "today" | "following" | "watching";

type Entry = {
  id: Tab;
  href: string;
  label: string;
};

// Today links to `/app` (not `/`) because `/` does UA sniffing and
// serves the marketing LandingShell on desktop. The desktop sidebar
// only renders at md+, where any link to `/` would punt the user out
// of the app and back to the marketing site. `/app` is the explicit
// "open the app on any device" route that always renders Today.
const ENTRIES: Entry[] = [
  { id: "today", href: "/app", label: "Today" },
  { id: "following", href: "/following", label: "Following" },
  { id: "watching", href: "/watching", label: "Watching" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  // Today is the only entry that has two valid pathnames — `/app`
  // (the canonical app route) and `/` (the mobile UA branch that
  // also renders TodayClient). Both should highlight Today.
  if (href === "/app") return pathname === "/app" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// One nav row — a labels-only mono wordmark with an ink/mute register and
// a short vertical brand tick when active. Shared by the primary rail
// (Today / Following / Watching) and the secondary rows (How it works /
// Settings), which run one step smaller.
function NavRow({
  href,
  label,
  active,
  size = 12,
}: {
  href: string;
  label: string;
  active: boolean;
  size?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className="relative flex min-h-[44px] items-center pl-[14px] uppercase transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size,
        fontWeight: active ? 700 : 600,
        letterSpacing: "0.16em",
        color: active ? "var(--ink)" : "var(--mute-1)",
      }}
    >
      {/* Active tick — a short vertical brand rule at the leading edge, the
          vertical analog of the TabBar's under-word tick. The word stays in
          the ink register; only the tick carries the vermilion. */}
      <span
        aria-hidden
        className="absolute left-0 block w-[2px]"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: 14,
          background: active ? "var(--brand)" : "transparent",
        }}
      />
      {label}
    </Link>
  );
}

export function DesktopSidebarNav({ active }: { active?: Tab }) {
  const pathname = usePathname();
  const liveRail = useLiveRail();

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r md:flex"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
      }}
    >
      {/* Brand lockup — links to /app, not /, for the same reason as
          the Today nav entry (root path serves the marketing landing
          on desktop UA, and we want clicks inside the app shell to
          stay in the app shell). Mono wordmark for the System D rail. */}
      <Link
        href="/app"
        prefetch
        className="flex items-center gap-2 px-5 pb-5 pt-6"
        aria-label="No Noise Scores, Today"
      >
        <BrandMark size={26} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "var(--ink)",
          }}
        >
          No Noise Scores
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 px-5">
        <ul className="space-y-1">
          {ENTRIES.map(({ id, href, label }) => (
            <li key={id}>
              <NavRow
                href={href}
                label={label}
                active={active === id || isActive(pathname, href)}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Live now — every followed or pinned game currently in progress
          (pinned first). Renders only when at least one is live, so the rail
          stays calm otherwise. Each row links straight to that game's detail;
          the breathing dot is colored by sport (orange NBA / green Summer
          Soccer), mirroring the live-status motif used elsewhere. Agate rows,
          no pills. */}
      {liveRail.length > 0 ? (
        <div className="px-5 pb-3">
          <p
            className="mb-2 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              color: "var(--mute-1)",
              fontWeight: 700,
            }}
          >
            Live now
          </p>
          <ul className="space-y-1">
            {liveRail.map((pip) => {
              const accent = pip.sport === "wc" ? "var(--wc)" : "var(--nba)";
              return (
                <li key={pip.id}>
                  <Link
                    href={`/game/${pip.id}`}
                    prefetch
                    aria-label={`Open live game ${pip.awayCode} vs ${pip.homeCode}`}
                    className="flex min-h-[36px] items-center gap-2 transition-opacity active:opacity-70"
                    style={{ color: "var(--ink)" }}
                  >
                    <span
                      aria-hidden
                      className="no-noise-live-fade h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                    <span
                      className="truncate uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {pip.awayCode} · {pip.homeCode}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Secondary nav — How it works for first-time / curious visitors,
          Settings for everyone. Both sit at the bottom of the rail so
          they read as "supporting" rather than primary actions. */}
      <div className="space-y-1 px-5 pb-5">
        <NavRow
          href="/how-it-works"
          label="How it works"
          active={pathname === "/how-it-works"}
          size={11}
        />
        <NavRow
          href="/settings"
          label="Settings"
          active={Boolean(pathname?.startsWith("/settings"))}
          size={11}
        />
      </div>
    </aside>
  );
}
