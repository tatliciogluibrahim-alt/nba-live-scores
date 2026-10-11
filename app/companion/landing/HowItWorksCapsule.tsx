// How it works — four-step capsule. The four concepts that define the
// app: Follow → Alert → Track → No-Spoilers. Each one is one short
// sentence. No marketing inflation, no bullet points. The capsule sits
// between the hero and the moments band so the visitor understands the
// vocabulary before they see what we cover.
//
// "Pin" is a dead word in the app (2026-07-03): the verbs are "Add to
// Watching" on the web and "Track on Lock Screen" in the iPhone app.
// No-Spoilers no longer blurs (2026-08-31): hidden scores are placeholder
// dots, revealed one game at a time.

const STEPS = [
  {
    title: "Follow",
    body: "Tell the app what you care about. Teams, countries, series, tournaments. Only those show up.",
  },
  {
    title: "Alert",
    body: "Per-follow notifications. Three volume levels. You decide which moments buzz your phone.",
  },
  {
    title: "Track",
    body: "Add one game to Watching to keep it in view. On iPhone, it can sit on your Lock Screen too. Tracking, not alerts.",
  },
  {
    title: "No-Spoilers",
    body: "Hide every score and result until you're ready. Push previews stay vague. Reveal one game with a tap.",
  },
];

export function HowItWorksCapsule() {
  return (
    <section
      className="mx-auto px-8 py-16 md:px-12 lg:px-20"
      style={{ maxWidth: 1280 }}
    >
      <SectionHeader
        eyebrow="How it works"
        title="Four ideas. That's the app."
      />

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {STEPS.map((step, idx) => (
          <article
            key={step.title}
            className="rounded-[16px] border px-5 py-6"
            style={{
              background: "var(--paper)",
              borderColor: "var(--line)",
            }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{
                  background: "var(--ink)",
                  color: "var(--cream)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {idx + 1}
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                {step.title}
              </h3>
            </div>
            <p
              className="text-[14px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Shared section header pattern ──────────────────────────────────────
// Eyebrow + display title. Used across landing sections to keep the
// hierarchy consistent.

export function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-[60ch]">
      <p
        className="mb-2 text-[11px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "var(--nba)",
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="leading-[1.1]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 3.5vw, 44px)",
          fontWeight: 800,
          letterSpacing: "-0.015em",
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}
