import { Display } from "../../atoms/Display";

// Quiet-day Today payoff. Per STRATEGY.md: a good session is 15 seconds —
// calm is a feature.
//
// System D (D3 Task 6a): unboxed moment row — heavy top rule, hairline
// bottom, Display headline, mono/muted body. Was a dashed rounded card;
// dropped the enclosure so it speaks the same grammar as the other Today
// moments. Copy unchanged.

export function CalmCard() {
  return (
    <section
      style={{
        borderTop: "2px solid var(--rule)",
        borderBottom: "1px solid var(--line)",
        padding: "12px 0 14px",
      }}
      aria-label="Calm is a feature"
    >
      <Display as="p" size="sm" className="mb-1">
        Calm is a feature.
      </Display>
      <p
        className="max-w-[28ch] text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Nothing demanding your attention right now.
      </p>
    </section>
  );
}
