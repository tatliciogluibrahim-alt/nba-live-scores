import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ContentPageShell,
  H2,
  P,
  BulletList,
  CalloutBox,
} from "../../companion/landing/ContentPageShell";
import {
  WC_COUNTRIES,
  getCountry,
  type CountryEntry,
} from "../../companion/following/data/countries";
import {
  getCountryFixtures,
  type WCStaticFixture,
} from "../../companion/following/data/wc-fixtures";

const ET = "America/New_York";

// Format a static fixture as a search-friendly schedule line, e.g.
// "Sat, Jun 14, 3:00 PM ET · United States vs Türkiye". Times render in
// ET (the page's primary US audience); the build is deterministic since
// the timezone is pinned. No em-dashes (brand voice).
function fixtureLine(f: WCStaticFixture, country: CountryEntry): string {
  const oppCode = f.home === country.id ? f.away : f.home;
  const opp = getCountry(oppCode);
  const d = new Date(f.kickoff);
  const date = d.toLocaleDateString("en-US", {
    timeZone: ET,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time} ET · ${country.name} vs ${opp?.name ?? oppCode}`;
}

// /wc/[country] — static SEO landing pages for each Summer Soccer 2026
// country. 48 pages generated at build time via generateStaticParams.
//
// Purpose: capture organic search for "[Country] Summer Soccer 2026
// schedule," "when does [Country] play," etc. The web's pre-tournament
// search surge starts ~7-10 days before the June 11 kickoff. Pages
// need to be live and indexed before that to rank.
//
// These pages are DIFFERENT from /country/[code]:
//   • /country/[code] is the dynamic in-app country detail (live
//     standings, fixture list, picker integration). Mobile-first.
//   • /wc/[country] is the SEO landing surface. Static, content-led,
//     keyword-rich, with a clear "Open in app" CTA pointing to
//     /country/[code]. Desktop-friendly.
//
// Both share the country data layer (countries.ts). The static page
// has no LIVE data (scores, standings), but it does embed the curated
// group-stage schedule (wc-fixtures.ts) with real kickoff times, which
// is what most pre-tournament searches actually want. Content focuses
// on group context, the schedule, the brand pitch ("calm companion"),
// and the cross-link to the live experience.

// Pre-render every country at build time. Switching to dynamic later
// would require revalidation logic — for now, every page is a static
// HTML file deployed with the build.
export function generateStaticParams() {
  return WC_COUNTRIES.map((c) => ({
    country: c.id.toLowerCase(),
  }));
}

// Map of group letter → all four countries in that group. Used for
// the "group-mates" section. Computed once at module load since
// WC_COUNTRIES is static.
function getGroupMates(country: CountryEntry): CountryEntry[] {
  return WC_COUNTRIES.filter(
    (c) => c.group === country.group && c.id !== country.id
  );
}

// ── Metadata ─────────────────────────────────────────────────────────
// One generateMetadata call per page, providing tailored title +
// description per country. The title pattern follows what people
// actually search for: "[Country] Summer Soccer 2026 schedule."

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: countryParam } = await params;
  const country = getCountry(countryParam.toUpperCase());
  if (!country) {
    return {
      title: "Country not found | No Noise Scores",
    };
  }

  const title = `${country.name} World Cup 2026 schedule | No Noise Scores`;
  const description = `${country.name} are in Group ${country.group} at the 2026 World Cup. Follow ${country.name}'s path with kickoff and full-time alerts. A calm sports companion. No feeds, no ads, no noise.`;
  const canonical = `https://nonoisescores.app/wc/${country.id.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "No Noise Scores",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function CountryLandingPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: countryParam } = await params;
  const country = getCountry(countryParam.toUpperCase());
  if (!country) {
    notFound();
  }

  const mates = getGroupMates(country);
  const fixtures = getCountryFixtures(country.id);
  const appLink = `/country/${country.id}`;

  // JSON-LD structured data — SportsEvent schema lets Google surface
  // this with rich-result formatting in the SERP. Each group fixture is
  // a subEvent with its real kickoff time (from the static fixtures
  // table) so the SERP can show the schedule. Knockout times aren't set
  // until the draw, so they stay out.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${country.name} at the 2026 World Cup`,
    startDate: "2026-06-11",
    endDate: "2026-07-19",
    eventStatus: "https://schema.org/EventScheduled",
    sport: "Soccer",
    location: {
      "@type": "Place",
      name: "United States, Canada, and Mexico",
    },
    homeTeam: {
      "@type": "SportsTeam",
      name: country.name,
    },
    url: `https://nonoisescores.app/wc/${country.id.toLowerCase()}`,
    subEvent: fixtures.map((f) => {
      const oppCode = f.home === country.id ? f.away : f.home;
      const opp = getCountry(oppCode);
      return {
        "@type": "SportsEvent",
        name: `${country.name} vs ${opp?.name ?? oppCode}`,
        startDate: f.kickoff,
        eventStatus: "https://schema.org/EventScheduled",
        sport: "Soccer",
      };
    }),
  };

  return (
    <>
      {/* JSON-LD for Google rich results. Inlined as a script tag the
          server emits — no client-side JS overhead. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ContentPageShell
        eyebrow={`World Cup 2026 · Group ${country.group}`}
        headline={`${country.flag}  ${country.name} at the 2026 World Cup.`}
        intro={`${country.name} are in Group ${country.group} at the 2026 World Cup. Follow ${country.name} on No Noise Scores for their group, their path through the knockout rounds, and kickoff and full-time alerts on every match.`}
      >
        <H2>Group {country.group}</H2>
        <P>
          {country.name} play three group-stage matches against:
        </P>
        <BulletList
          items={mates.map((m) => `${m.flag}  ${m.name}`)}
        />
        <P>
          Top two from Group {country.group} advance to the Round of 32
          knockouts. The best four third-place finishers across all
          groups also move on.
        </P>

        {fixtures.length > 0 ? (
          <>
            <H2>{country.name}&apos;s group schedule</H2>
            <P>
              All three group-stage matches, with kickoff times in ET:
            </P>
            <BulletList items={fixtures.map((f) => fixtureLine(f, country))} />
            <P>
              <a
                href={appLink}
                style={{
                  color: "var(--ink)",
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                  textUnderlineOffset: "3px",
                  fontWeight: 600,
                }}
              >
                See the live Group {country.group} standings →
              </a>
            </P>
          </>
        ) : null}

        <H2>Follow {country.name} on No Noise Scores</H2>
        <P>
          Pick {country.name} as your Summer Soccer country. You get a
          country page showing the live group standings, the next
          match (opponent, time, channel), and a path-to-final
          visualization. Push alerts fire at kickoff and full time
          for every {country.name} match.
        </P>
        <P>
          <a
            href={appLink}
            style={{
              color: "var(--ink)",
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
              fontWeight: 600,
            }}
          >
            Open {country.name} in No Noise Scores →
          </a>
        </P>

        <H2>Watching matches on delay?</H2>
        <CalloutBox eyebrow="No-Spoilers ready">
          Turn on No-Spoilers in Settings. Group standings, scores, and
          recap cards stay blurred. The push you get at full time will
          read &quot;Match wrapped. Tap when you&apos;re ready.&quot;.
          No score, no winner. Watch the replay on your own clock.
        </CalloutBox>

        <H2>About No Noise Scores</H2>
        <P>
          A calm sports companion for the moments that matter. Follow
          what matters. Skip the rest. No feeds, no ads, no noise. Just
          the scores, alerts, and recaps for what you care about.
        </P>
        <P>
          <a
            href="/world-cup-2026-app"
            style={{
              color: "var(--ink)",
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
            }}
          >
            More about the Summer Soccer pages
          </a>
          .
        </P>
      </ContentPageShell>
    </>
  );
}
