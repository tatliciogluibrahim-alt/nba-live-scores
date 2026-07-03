"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// System D bottom TabBar (mobile only). Broadsheet chrome, not a filled
// control strip: cream bar, a hairline top rule (--line), and mono
// wordmark tabs. Founder call 2026-07-03: labels-only — the generic line
// icons (sun/heart/pin) read as stock AI iconography; the editorial
// register carries better as pure type. The active tab is carried by the
// ink register itself — full ink + heavier weight + a short ink tick
// under the word (spec §2: "active tab ink-weight"). Inactive tabs sit
// at --mute-1. Three tabs, three jobs, real Next.js navigation.

type Tab = {
  id: "today" | "following" | "watching";
  href: string;
  label: string;
  ariaLabel: string;
};

const TABS: Tab[] = [
  { id: "today", href: "/", label: "Today", ariaLabel: "Today" },
  { id: "following", href: "/following", label: "Following", ariaLabel: "Following" },
  { id: "watching", href: "/watching", label: "Watching", ariaLabel: "Watching, pinned games" },
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
        // Hairline top rule — System D chrome (not the heavy 2px --rule the
        // masthead / section heads carry).
        borderColor: "var(--line)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        // In landscape on Dynamic-Island devices, the island sits on
        // the left or right edge — without these insets the tab bar's
        // background and items run underneath it.
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-4 pt-1">
        {TABS.map(({ id, href, label, ariaLabel }) => {
          const active = isActive(pathname, href);
          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                aria-label={ariaLabel}
                aria-current={active ? "page" : undefined}
                prefetch
                className="mx-auto flex min-h-[44px] flex-col items-center justify-center gap-[5px] px-2 py-1 transition-opacity active:opacity-70"
                // Ink = here, mute = elsewhere. The active tab reads through
                // the ink register, no pill or fill.
                style={{ color: active ? "var(--ink)" : "var(--mute-1)" }}
              >
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: active ? 700 : 600,
                    letterSpacing: "0.16em",
                  }}
                >
                  {label}
                </span>
                {/* Active tick — a short ink rule under the wordmark, so
                    "where am I" reads even at a glance without an icon. */}
                <span
                  aria-hidden
                  className="block h-[2px] w-5"
                  style={{ background: active ? "var(--ink)" : "transparent" }}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
