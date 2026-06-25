import Link from "next/link";
import { BrandMark } from "../frame/BrandMark";
import { APP_STORE_URL } from "../../lib/app-store";

// Shared marketing header — brand lockup + nav + install CTAs. Used by the
// landing (sticky, so the logo/nav/CTA persist past the hero) and the static
// content pages (static). One source of truth so the two surfaces never drift.

export function LandingHeader({ sticky = false }: { sticky?: boolean }) {
  return (
    <header
      // Fixed (not sticky): the app sets `overflow-x: clip` on <html>, which
      // breaks descendant position:sticky. Fixed is viewport-relative and
      // immune to that; the hero's top padding absorbs the bar height.
      className={sticky ? "fixed inset-x-0 top-0 z-40 border-b" : "border-b"}
      style={{
        borderColor: "var(--line)",
        ...(sticky
          ? {
              background: "var(--bar-blur-bg, var(--cream))",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }
          : { background: "var(--cream)" }),
      }}
    >
      <div
        className="mx-auto flex items-center justify-between px-8 py-4 md:px-12 lg:px-20"
        style={{ maxWidth: 1280 }}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="No Noise Scores home">
          <BrandMark size={26} />
          <span
            className="text-[17px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            No Noise Scores
          </span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            href="/how-it-works"
            className="hidden text-[13px] md:inline"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            How it works
          </Link>
          <Link
            href="/changelog"
            className="hidden text-[13px] md:inline"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Changelog
          </Link>
          {/* Browser is the desktop-correct primary (the App Store button is a
              dead end in a desktop browser); the QR card in the hero is the
              phone bridge. "Get the app" stays for mobile SEO traffic. */}
          <Link
            href="/app"
            className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{ background: "var(--ink)", color: "var(--cream)", border: "1px solid var(--ink)" }}
          >
            Open in browser
          </Link>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener"
            className="hidden text-[13px] md:inline"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Get the app
          </a>
        </nav>
      </div>
    </header>
  );
}
