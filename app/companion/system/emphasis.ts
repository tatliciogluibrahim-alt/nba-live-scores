//
// Winner emphasis at rest (spec §2): winner code+score full ink, loser
// muted — the shipped Game Pulse "ink = ahead / mute = behind" language
// applied to finished games. The draw law (§10): a level full-time
// score emphasizes no one.

export function winnerSide(
  away: number | null,
  home: number | null,
  status: "live" | "upcoming" | "final"
): "away" | "home" | null {
  if (status !== "final") return null;
  if (away == null || home == null) return null;
  if (away === home) return null; // draw law
  return away > home ? "away" : "home";
}
