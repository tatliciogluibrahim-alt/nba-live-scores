import { Display } from "../../atoms/Display";

// Quiet-day Today payoff card. Dashed border, single sentence + tagline.
// Per STRATEGY.md: a good session is 15 seconds — calm is a feature.

export function CalmCard() {
  return (
    <section
      className="rounded-[14px] border border-dashed px-4 py-5 text-center"
      style={{
        background: "var(--paper)",
        borderColor: "var(--mute-2)",
      }}
    >
      <Display as="p" size="sm">
        Calm is a feature.
      </Display>
      <p
        className="mx-auto mt-2 max-w-[22ch] text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Nothing demanding your attention right now.
      </p>
    </section>
  );
}
