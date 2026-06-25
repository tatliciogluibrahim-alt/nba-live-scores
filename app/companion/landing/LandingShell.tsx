// LandingShell — the desktop marketing surface served at `/` for
// non-mobile UAs. Mobile visitors at `/` render the app's Today screen
// directly. See `app/page.tsx` for the route split.
//
// Phase 11 builds this out: hero block (left product story, right
// phone-sized app preview), how-it-works capsule, "built for the
// moments" band, "why it feels different" pillars, FAQ, footer.
//
// This file lives in its own directory (`app/companion/landing/`) so
// the landing-only primitives (Section, FAQ, Pillars) don't bleed into
// the app's companion atoms.

import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { HowItWorksCapsule } from "./HowItWorksCapsule";
import { MomentsBand } from "./MomentsBand";
import { DifferentiatorPillars } from "./DifferentiatorPillars";
import { LandingFAQ } from "./LandingFAQ";
import { FAQ_ITEMS } from "./faq-data";
import { LandingFooter } from "./LandingFooter";

const SITE = "https://nonoisescores.app";

// JSON-LD payload — three schemas concatenated as a graph. Tells Google,
// OAI-SearchBot, ClaudeBot, PerplexityBot, etc. what this site is and
// surfaces FAQ Q&A pairs for "People also ask" placements.

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "No Noise Scores",
      url: SITE,
      logo: `${SITE}/og-image.png`,
      sameAs: ["https://www.instagram.com/nonoisescores"],
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE}/#app`,
      name: "No Noise Scores",
      url: SITE,
      applicationCategory: "SportsApplication",
      operatingSystem: "Any",
      description:
        "A calm sports companion for the moments that matter. Follow what matters. Skip the rest.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE}/#org` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE}/#faq`,
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export function LandingShell() {
  return (
    <main
      className="mx-auto"
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        minHeight: "100vh",
      }}
    >
      {/* JSON-LD structured data — emitted as a single script tag so
          crawlers can pick it up without parsing the React tree. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingHeader sticky />
      <LandingHero />
      <HowItWorksCapsule />
      <MomentsBand />
      <DifferentiatorPillars />
      <LandingFAQ />
      <LandingFooter />
    </main>
  );
}
