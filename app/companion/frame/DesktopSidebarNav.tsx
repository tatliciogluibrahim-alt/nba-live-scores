"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { BrandMark } from "./BrandMark";

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

const ENTRIES: Entry[] = [
  { id: "today", href: "/", label: "Today", Icon: IconSun },
  { id: "following", href: "/following", label: "Following", Icon: IconHeart },
  { id: "watching", href: "/watching", label: "Watching", Icon: IconPin },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebarNav({ active }: { active?: Tab }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r md:flex"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
      }}
    >
      {/* Brand lockup */}
      <Link
        href="/"
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
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition"
                  style={{
                    color: isCurrent ? "var(--ink)" : "var(--mute-1)",
                    fontWeight: isCurrent ? 700 : 500,
                    background: isCurrent ? "var(--paper)" : "transparent",
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

      {/* Settings tucked at bottom of the rail */}
      <div className="px-3 pb-5">
        <Link
          href="/settings"
          prefetch
          aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition"
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
