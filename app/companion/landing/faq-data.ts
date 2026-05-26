// FAQ data — extracted out of LandingFAQ.tsx so both the client-side
// FAQ component AND the server-side JSON-LD payload in LandingShell can
// import it. When FAQ_ITEMS lived inside the "use client" component,
// the server bundle received a wrapped client reference (not the
// literal array), which broke .map() at server build time.

export type FAQItem = { q: string; a: string };

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Is it free?",
    a: "Yes. No ads, no paywalls. A paid morning email recap might come later; the app itself stays free.",
  },
  {
    q: "Does it work on iPhone?",
    a: "Yes. Open the site in Safari, tap Share, then Add to Home Screen. Push notifications work after install — that's an Apple rule for web apps, not us.",
  },
  {
    q: "What sports are covered?",
    a: "NBA Playoffs and FIFA World Cup 2026 right now. NFL lands ahead of the August 2026 season opener. More sports get added as their moment arrives.",
  },
  {
    q: "How is this different from Apple Sports?",
    a: "Apple Sports is fast and scores-first. This one's slower-paced — alert tiers per follow, recap cards, series context, and a hide-everything mode for watching on delay. They're different tools for different moods.",
  },
  {
    q: "Does it have spoilers?",
    a: "Only when you want them. Turn No-Spoilers on in Alerts & Notifications and scores, headlines, and outcomes blur across every screen, including push previews. Tap to reveal one at a time.",
  },
  {
    q: "When does NFL ship?",
    a: "August 2026, a few weeks before the season opener. The data layer and design are already in place; not rushing the rest.",
  },
];
