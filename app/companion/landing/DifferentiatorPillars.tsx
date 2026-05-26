import { SectionHeader } from "./HowItWorksCapsule";

// "Why it feels different" — three pillars that articulate the wedge
// without naming competitors. Calm / Personal / Hide-by-default-when-
// you-want. These are the three things AGENTS.md says the app should
// always say clearly.

const PILLARS = [
  {
    title: "Calm by default.",
    body: "No feeds. No top-stories. No trending. No betting modules, no fantasy ads, no doomscroll. The app sits quiet until something you follow matters.",
  },
  {
    title: "Personalized, not algorithmic.",
    body: "You pick what you follow. You pick what alerts you. The app respects those picks. It doesn't decide for you and it doesn't show you things to keep you scrolling.",
  },
  {
    title: "Hide-by-default when you want.",
    body: "Turn No-Spoilers on and scores, headlines, and outcomes blur across every screen — push previews included. Watch on delay. Reveal one moment at a time.",
  },
];

export function DifferentiatorPillars() {
  return (
    <section
      className="mx-auto px-8 py-16 md:px-12 lg:px-20"
      style={{ maxWidth: 1280 }}
    >
      <SectionHeader
        eyebrow="Why it feels different"
        title="Three things every other sports app gets wrong."
      />

      <div className="mt-10 space-y-6 md:space-y-8">
        {PILLARS.map((p, idx) => (
          <article
            key={p.title}
            className="grid items-start gap-6 border-t pt-6 md:grid-cols-[80px_1fr] md:gap-10"
            style={{ borderColor: "var(--line)" }}
          >
            <span
              aria-hidden
              className="inline-block text-[44px] leading-none md:text-[56px]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                color: "var(--nba)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              0{idx + 1}
            </span>
            <div>
              <h3
                className="mb-2 leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.015em",
                  color: "var(--ink)",
                }}
              >
                {p.title}
              </h3>
              <p
                className="max-w-[60ch] text-[16px] leading-snug"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {p.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
