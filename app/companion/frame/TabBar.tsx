"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

// Three tabs, three jobs. Real Next.js navigation.
// Pin icon for Watching (NOT a TV — communicates pinned games, not streaming).
// Active tab gets a 3px ink pill above the icon + bolder label weight.

type Tab = {
  id: "today" | "following" | "watching";
  href: string;
  label: string;
  ariaLabel: string;
  Icon: () => ReactElement;
};

function TabSun() {
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

function TabHeart() {
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

function TabPin() {
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

const TABS: Tab[] = [
  { id: "today", href: "/", label: "Today", ariaLabel: "Today", Icon: TabSun },
  {
    id: "following",
    href: "/following",
    label: "Following",
    ariaLabel: "Following",
    Icon: TabHeart,
  },
  {
    id: "watching",
    href: "/watching",
    label: "Watching",
    ariaLabel: "Watching, pinned games",
    Icon: TabPin,
  },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      // Mobile-only. At md+ the DesktopSidebarNav takes over as the
      // primary nav surface (Phase 22.5-D).
      className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{
        background: "var(--cream)",
        borderColor: "var(--line)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        // In landscape on Dynamic-Island devices, the island sits on
        // the left or right edge — without these insets the tab bar's
        // background and items run underneath it.
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-4 pt-2">
        {TABS.map(({ id, href, label, ariaLabel, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                aria-label={ariaLabel}
                aria-current={active ? "page" : undefined}
                prefetch
                className="relative mx-auto flex min-h-[44px] flex-col items-center gap-1 px-2 py-1 transition-opacity"
                style={{
                  color: active ? "var(--ink)" : "var(--mute-1)",
                  opacity: active ? 1 : 0.85,
                }}
              >
                {/* Active indicator pill — 3px ink */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full transition-[width] duration-200"
                  style={{
                    width: active ? 18 : 0,
                    height: 3,
                    background: "var(--ink)",
                  }}
                />
                <Icon />
                <span
                  className="text-[10px] uppercase tracking-[0.06em]"
                  style={{ fontWeight: active ? 800 : 600 }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
