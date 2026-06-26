// SpotlightBand — the one dark beat on an otherwise cream page. A full-bleed
// ink band that states the brand's whole position ("No feeds. No ads. No
// noise.") in cream-on-dark, the way a stage goes black for the line that
// matters. The contrast IS the drama; uses the design system's cream-on-dark
// scale so it stays on-brand, not a generic dark-mode section.

export function SpotlightBand() {
  return (
    <section
      className="py-24 md:py-32"
      style={{ background: "var(--ink)", color: "var(--cream-on-dark-primary)" }}
    >
      <div
        className="mx-auto px-8 text-center md:px-12 lg:px-20"
        style={{ maxWidth: 1100 }}
      >
        <p
          className="mb-6 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.22em",
            color: "var(--cream-on-dark-tertiary)",
            fontWeight: 700,
          }}
        >
          The whole point
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 6vw, 84px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
          }}
        >
          <span style={{ color: "var(--cream-on-dark-secondary)" }}>
            No feeds. No ads.{" "}
          </span>
          <span style={{ color: "var(--cream-on-dark-primary)" }}>No noise.</span>
        </h2>
        <p
          className="mx-auto mt-7 max-w-[52ch] text-[18px] leading-snug"
          style={{ color: "var(--cream-on-dark-secondary)", fontWeight: 500 }}
        >
          The app stays quiet until something you follow happens. Then it tells
          you, once, and gets out of the way.
        </p>
      </div>
    </section>
  );
}
