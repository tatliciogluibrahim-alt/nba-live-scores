import { Display } from "../atoms/Display";
import { FOLLOW_CHOICES, FollowChoice } from "./FollowChoice";

// /following/add — the four-noun choice grid for users who already have
// follows and want to add more. Empty Following uses FOLLOWING_EMPTY which
// also renders this set, so the choice copy is centralised in FOLLOW_CHOICES.

export function FollowingAdd() {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-2">
        Follow more.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pick a team, a country, a playoff series, or a tournament. We surface only their games.
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
    </main>
  );
}
