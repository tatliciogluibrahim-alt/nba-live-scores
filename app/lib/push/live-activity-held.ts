import type { LiveActivityContentState } from "./apns-sender";

// Courtside C4b: held scores out of ActivityKit. Before this, every Live
// Activity token got real digits and a No-Spoilers tile only hid them, so
// the score sat in the system's copy of the activity. Now a token gets
// zeros plus `held: true` when its activity is redacted, its app build can
// draw a held state (`heldCapable`, from the build's pushToken event), and
// the device hasn't revealed it. Every other token gets real digits, so a
// build that predates `held` never shows 0–0 as a score.
//
// Reveal: the tile's Reveal button asks /api/push/live-activity-reveal for
// the score, which also marks the token revealed so later pushes carry
// digits.

export type HeldFlags = {
  redacted?: boolean;
  heldCapable?: boolean;
  revealed?: boolean;
};

export function isHeldToken(t: HeldFlags): boolean {
  return t.redacted === true && t.heldCapable === true && t.revealed !== true;
}

export function contentForToken(
  content: LiveActivityContentState,
  t: HeldFlags
): LiveActivityContentState {
  if (!isHeldToken(t)) return content;
  return { ...content, awayScore: 0, homeScore: 0, held: true };
}
