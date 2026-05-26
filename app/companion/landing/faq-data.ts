// FAQ data — extracted out of LandingFAQ.tsx so both the client-side
// FAQ component AND the server-side JSON-LD payload in LandingShell can
// import it. When FAQ_ITEMS lived inside the "use client" component,
// the server bundle received a wrapped client reference (not the
// literal array), which broke .map() at server build time.

export type FAQItem = { q: string; a: string };

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Is it free?",
    a: "Yes. The app is free. No ads, no paywalls. A paid morning Brief is in the plan for later; the app itself stays free.",
  },
  {
    q: "Does it work on iPhone?",
    a: "Yes. Open the site in Safari and tap Share → Add to Home Screen. The app installs as a PWA. Push notifications work after install.",
  },
  {
    q: "What sports are covered?",
    a: "NBA Playoffs and the FIFA World Cup 2026 right now. NFL ships ahead of the August 2026 season. We add sports moment-by-moment, not all at once.",
  },
  {
    q: "How is this different from Apple Sports?",
    a: "Apple Sports is a fast scores viewer with widgets and Live Activities. No Noise Scores is a calm companion with per-follow alert tiers, editorial recap cards, series context, and a real No-Spoilers mode. We don't try to beat Apple at speed — we beat them at calm.",
  },
  {
    q: "Does it have spoilers?",
    a: "Only when you want them. Turn No-Spoilers on once in Alerts & Notifications and scores, headlines, and outcomes blur across every screen — push previews included. Reveal one moment at a time.",
  },
  {
    q: "When does NFL ship?",
    a: "August 2026 — about five weeks before the season opener. We're not rushing it. Data layer + design doc are already in place.",
  },
];
