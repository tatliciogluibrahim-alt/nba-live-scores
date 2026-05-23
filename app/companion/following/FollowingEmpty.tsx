import { Display } from "../atoms/Display";
import { FOLLOW_CHOICES, FollowChoice } from "./FollowChoice";

// Following — empty / onboarding. One editorial headline + four nouns.
// No grid of every team in the league. Discovery happens in the picker.

export function FollowingEmpty() {
  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Tell us who you follow.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        We&apos;ll surface only their games. Everything else stays quiet.
      </p>

      <div className="space-y-2">
        {FOLLOW_CHOICES.map((c) => (
          <FollowChoice
            key={c.href}
            eyebrow={c.eyebrow}
            title={c.title}
            detail={c.detail}
            href={c.href}
          />
        ))}
      </div>
    </section>
  );
}
