"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { BrandMark } from "./BrandMark";
import { useLivePinned } from "./use-live-pinned";

// Desktop-only left sidebar nav. Mirrors the mobile TabBar (Today /
// Following / Watching) but laid out as a vertical rail with the
// brand lockup pinned at the top and Settings tucked at the bottom.
//
// Hidden below `md`. On mobile the bottom TabBar remains the primary
// nav surface; this rail replaces it at desktop widths. CompanionFrame
// reserves left padding (md:pl-[220px]) so the main column doesn't sit
// underneath the rail.
//
// First PR of Phase 22.5-D ("desktop bespoke lean"). Subsequent PRs
// can add live-game pips, follow-aware highlighting, keyboard shortcuts.

type Tab = "today" | "following" | "watching";

type Entry = {
  id: Tab;
  href: string;
  label: string;
  Icon: () => ReactElement;
};

function IconSun() {
  return (
    <svg
      width="20"
      height="20"
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

function IconHeart() {
  return (
    <svg
      width="20"
      height="20"
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

function IconPin() {
  return (
    <svg
      width="20"
      height="20"
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

function IconBook() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Today links to `/app` (not `/`) because `/` does UA sniffing and
// serves the marketing LandingShell on desktop. The desktop sidebar
// only renders at md+, where any link to `/` would punt the user out
// of the app and back to the marketing site. `/app` is the explicit
// "open the app on any device" route that always renders Today.
const ENTRIES: Entry[] = [
  { id: "today", href: "/app", label: "Today", Icon: IconSun },
  { id: "following", href: "/following", label: "Following", Icon: IconHeart },
  { id: "watching", href: "/watching", label: "Watching", Icon: IconPin },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  // Today is the only entry that has two valid pathnames — `/app`
  // (the canonical app route) and `/` (the mobile UA branch that
  // also renders TodayClient). Both should highlight Today.
  if (href === "/app") return pathname === "/app" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebarNav({ active }: { active?: Tab }) {
  const pathname = usePathname();
  const livePinned = useLivePinned();

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
          stay in the app shell). */}
      <Link
        href="/app"
        prefetch
        className="flex items-center gap-2 px-5 pb-5 pt-6"
        aria-label="No Noise Scores — Today"
      >
        <BrandMark size={26} />
        <span
          className="text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          No Noise Scores
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {ENTRIES.map(({ id, href, label, Icon }) => {
            const isCurrent = active === id || isActive(pathname, href);
            return (
              <li key={id}>
                <Link
                  href={href}
                  prefetch
                  aria-current={isCurrent ? "page" : undefined}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
                  style={{
                    color: isCurrent ? "var(--ink)" : "var(--mute-1)",
                    fontWeight: isCurrent ? 700 : 500,
                    background: isCurrent ? "var(--paper)" : undefined,
                    border: isCurrent
                      ? "1px solid var(--line)"
                      : "1px solid transparent",
                  }}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Live now — pinned games currently in progress. Renders only
          when at least one pinned game is live, so the rail stays calm
          otherwise. Each pip links straight to that game's detail. The
          breathing dot mirrors the live-status motif used elsewhere. */}
      {livePinned.length > 0 ? (
        <div className="px-3 pb-2">
          <p
            className="mb-1.5 px-3 text-[10px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              color: "var(--mute-1)",
              fontWeight: 600,
            }}
          >
            Live now
          </p>
          <ul className="space-y-1">
            {livePinned.map((pip) => (
              <li key={pip.id}>
                <Link
                  href={`/game/${pip.id}`}
                  prefetch
                  aria-label={`Open live game ${pip.awayCode} vs ${pip.homeCode}`}
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] transition"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 600,
                    background: "var(--nba-soft)",
                  }}
                >
                  <span
                    aria-hidden
                    className="no-noise-live-fade h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--nba)" }}
                  />
                  <span
                    className="truncate"
                    style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}
                  >
                    {pip.awayCode} · {pip.homeCode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Secondary nav — How it works for first-time / curious visitors,
          Settings for everyone. Both sit at the bottom of the rail so
          they read as "supporting" rather than primary actions. */}
      <div className="px-3 pb-5 space-y-1">
        <Link
          href="/how-it-works"
          prefetch
          aria-current={pathname === "/how-it-works" ? "page" : undefined}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
          style={{
            color: pathname === "/how-it-works" ? "var(--ink)" : "var(--mute-1)",
            fontWeight: pathname === "/how-it-works" ? 700 : 500,
          }}
        >
          <IconBook />
          <span>How it works</span>
        </Link>
        <Link
          href="/settings"
          prefetch
          aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition hover:bg-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
          style={{
            color: pathname?.startsWith("/settings")
              ? "var(--ink)"
              : "var(--mute-1)",
            fontWeight: pathname?.startsWith("/settings") ? 700 : 500,
          }}
        >
          <IconGear />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
