"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// System D bottom TabBar (mobile only). Broadsheet chrome, not a filled
// control strip: cream bar, a hairline top rule (--line), and mono
// wordmark tabs. Founder call 2026-07-03: labels-only — the generic line
// icons (sun/heart/pin) read as stock AI iconography; the editorial
// register carries better as pure type. The active tab is carried by the
// ink register itself — full ink + heavier weight + a short brand tick
// under the word (spec §2 + §5 v3). Inactive tabs sit
// at --mute-1. Four tabs, four jobs, real Next.js navigation.
//
// Larger Text: the bar keeps one size, like a native tab bar (labels and
// padding in px, so the rem-based text scaling never reaches it). Four
// words share 390px, and a growing label clipped to "WATCHI" at 150%.
// Each tab's spoken name is its visible label.

type Tab = {
  id: "today" | "schedule" | "following" | "watching";
  href: string;
  label: string;
};

// Four tabs, four jobs (S1, 2026-07-06): state → structure → setup →
// held. Schedule is the competition's full shape (day list, bracket,
// groups); Today stays personal and now.
const TABS: Tab[] = [
  { id: "today", href: "/", label: "Today" },
  { id: "schedule", href: "/schedule", label: "Schedule" },
  { id: "following", href: "/following", label: "Following" },
  { id: "watching", href: "/watching", label: "Watching" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  // Today has two valid app paths: `/` on the mobile front door and `/app`
  // as the explicit all-device entry used by cold game-detail fallbacks.
  if (href === "/") return pathname === "/" || pathname === "/app";
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
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-[16px] pt-[4px]">
        {TABS.map(({ id, href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                prefetch
                className="mx-auto flex min-h-[44px] flex-col items-center justify-center gap-[5px] px-[4px] py-[4px] transition-opacity active:opacity-70"
                // Ink = here, mute = elsewhere. The active tab reads through
                // the ink register, no pill or fill.
                style={{ color: active ? "var(--ink)" : "var(--mute-1)" }}
              >
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStretch: "var(--label-stretch)",
                    fontSize: 11,
                    fontWeight: active ? 800 : 600,
                    letterSpacing: "0.14em",
                  }}
                >
                  {label}
                </span>
                {/* Active tick — a short brand rule under the wordmark (C4
                    §5 v3), so "where am I" reads at a glance without an icon.
                    The word stays ink; only the tick carries the vermilion. */}
                <span
                  aria-hidden
                  className="block h-[2px] w-5"
                  style={{ background: active ? "var(--brand)" : "transparent" }}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
