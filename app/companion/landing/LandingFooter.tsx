import Link from "next/link";

// Footer — the "quiet library" of content links. Per AGENTS.md guidance,
// not hidden, not cloaked, just calmly visible at the bottom of the
// landing page. Subtle but usable.
//
// Sections: Features (manifesto pages), Guides (practical user
// education), Compare (competitor capture), Niche (sport-moment
// capture), Product (about / privacy / changelog / beta).

const COLUMNS = [
  {
    title: "Features",
    links: [
      { label: "No-Spoilers mode", href: "/features/no-spoilers" },
      { label: "Sports circle", href: "/features/sports-circle" },
      { label: "Quiet sports alerts", href: "/features/quiet-sports-alerts" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    title: "Guides",
    links: [
      {
        label: "Add to iPhone home screen",
        href: "/guides/how-to-add-to-iphone-home-screen",
      },
      { label: "Follow vs Pin", href: "/guides/follow-vs-pin" },
      {
        label: "Watch games later without spoilers",
        href: "/guides/watch-games-later-without-spoilers",
      },
    ],
  },
  {
    title: "Compare",
    links: [
      {
        label: "vs Apple Sports",
        href: "/compare/apple-sports-alternative",
      },
      { label: "vs ESPN app", href: "/compare/espn-app-alternative" },
      { label: "NBA Playoff alerts", href: "/nba-playoffs-alerts" },
      { label: "World Cup 2026 app", href: "/world-cup-2026-app" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Open the app", href: "/app" },
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Changelog", href: "/changelog" },
      { label: "Friend beta", href: "/beta" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      className="px-8 pb-12 pt-16 md:px-12 lg:px-20"
      style={{
        background: "var(--ink)",
        color: "var(--cream-on-dark-1, var(--cream))",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        {/* Lockup row */}
        <div className="mb-10 flex flex-wrap items-baseline gap-4">
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.015em",
              color: "var(--cream)",
            }}
          >
            No Noise Scores
          </p>
          <p
            className="text-[14px]"
            style={{
              color: "var(--cream-on-dark-2, rgba(241,234,216,0.7))",
              fontWeight: 500,
            }}
          >
            Follow what matters. Skip the rest.
          </p>
        </div>

        {/* Column grid */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p
                className="mb-4 text-[11px] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "var(--nba)",
                }}
              >
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] transition hover:underline"
                      style={{
                        color: "var(--cream-on-dark-1, rgba(241,234,216,0.9))",
                        fontWeight: 500,
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div
          className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: "rgba(241,234,216,0.15)" }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="https://instagram.com/nonoisescores"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] transition hover:underline"
              style={{
                color: "var(--cream-on-dark-1, rgba(241,234,216,0.9))",
                fontWeight: 500,
              }}
            >
              @nonoisescores on Instagram
            </a>
            <a
              href="mailto:tatlicioglu.ibrahim@gmail.com"
              className="text-[12px] transition hover:underline"
              style={{
                color: "var(--cream-on-dark-1, rgba(241,234,216,0.9))",
                fontWeight: 500,
              }}
            >
              tatlicioglu.ibrahim@gmail.com
            </a>
          </div>
          <p
            className="text-[11px]"
            style={{
              color: "var(--cream-on-dark-2, rgba(241,234,216,0.5))",
              fontWeight: 500,
            }}
          >
            © 2026 No Noise Scores.
          </p>
        </div>
      </div>
    </footer>
  );
}
