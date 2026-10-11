import type { SituationView } from "./nfl-situation";

// The live NFL situation line's text: "IND ball · 1st & Goal at PIT 3",
// plus its one restrained red-zone mark, a small caps "RED ZONE" set in the
// surface's full ink while the line stays in its quieter tone. No new color
// (Courtside: color is identity and live only), so the mark is weight and
// case, and it reads as words for VoiceOver and for anyone who can't tell
// colors apart. Inherits the parent's font and color; callers style the
// line and pass the ink for the mark.
//
// Callers only render this for a game that is shown: situationView() is
// null for a game hidden by No-Spoilers.

export function SituationText({
  view,
  markColor,
}: {
  view: SituationView;
  /** Full-strength ink of the surface (porcelain ink, cream on the ink
   *  field, cream on the accent field). */
  markColor: string;
}) {
  return (
    <>
      {view.text}
      {view.redZone ? (
        <>
          <span aria-hidden>{" · "}</span>
          <span
            className="whitespace-nowrap uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8em",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: markColor,
            }}
          >
            Red zone
          </span>
        </>
      ) : null}
    </>
  );
}
