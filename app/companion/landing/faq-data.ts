// FAQ data — extracted out of LandingFAQ.tsx so both the client-side
// FAQ component AND the server-side JSON-LD payload in LandingShell can
// import it. When FAQ_ITEMS lived inside the "use client" component,
// the server bundle received a wrapped client reference (not the
// literal array), which broke .map() at server build time.

export type FAQItem = { q: string; a: string };

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Is it free?",
    a: "Yes, for most people. Follows are unlimited and free. Alerts are on the house for your first 3 follows. If you want alerts on more than that, a paid tier unlocks unlimited. That helps cover the cost of running the notification backend. No ads either way.",
  },
  {
    q: "Does it work on iPhone?",
    a: "Yes. Get it from the App Store in one tap, or add the web app to your home screen from Safari (tap Share, then Add to Home Screen). Push notifications work either way.",
  },
  {
    q: "What sports are covered?",
    a: "The NFL season is the current moment: follow your team, browse the full schedule, and get alerts from kickoff to the Super Bowl. NBA Playoffs and Summer Soccer 2026 had their moments earlier this year. More sports get added as their moment arrives.",
  },
  {
    q: "How is this different from Apple Sports?",
    a: "Apple Sports is fast and scores-first. This one's slower-paced. Alert tiers per follow, recap cards, series context, and a hide-everything mode for watching on delay. Different tools for different moods.",
  },
  {
    q: "Does it have spoilers?",
    a: "Only when you want them. Turn No-Spoilers on in Alerts & Notifications and scores, headlines, and outcomes blur across every screen, including push previews. Tap to reveal one at a time.",
  },
  {
    q: "Is the NFL live?",
    a: "Yes. Follow your team, browse the full schedule, and track games on your Lock Screen. Alerts run from the season opener through the Super Bowl.",
  },
];
