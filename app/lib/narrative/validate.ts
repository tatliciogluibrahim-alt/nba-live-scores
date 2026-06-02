import type { GameFacts } from "./types";

// Output validation — the no-hallucination + on-voice gate. A generated
// line only ships if it passes BOTH checks. On failure the caller
// retries once, then falls back to the deterministic template, so a bad
// generation can never reach a user.

const BANNED_WORDS =
  /\b(amazing|incredible|stunning|insane|unbelievable|must-see|epic|thrilling|sensational|electrifying|jaw-dropping|impressive|huge|massive|clutch|must-win|unstoppable)\b/i;

// Sports-talk-radio clichés. The system prompt tells the model not to
// use these, but the validator catches them if it slips. A failed
// validation retries once, then falls back to the template — so a
// "handled their business" line never reaches a user.
const BANNED_PHRASES = [
  /\bhandled (their|its) business\b/i,
  /\btook care of\b/i,
  /\bgot the job done\b/i,
  /\bbusiness trip\b/i,
  /\bpunched (their|its) ticket\b/i,
  /\bsent a message\b/i,
  /\bstatement (win|game|night)\b/i,
  /\bmade it look easy\b/i,
  /\bput it away\b/i,
  /\bclosed the door\b/i,
];

export type ValidationResult = { ok: boolean; reasons: string[] };

/** Every integer in the text must be one of the facts' grounded numbers.
 *  This is the hard zero-hallucination rule on figures. */
function numbersGrounded(text: string, facts: GameFacts): string[] {
  const grounded = new Set(facts.groundedNumbers);
  const found = text.match(/\d+/g) ?? [];
  const ungrounded = found
    .map((n) => parseInt(n, 10))
    .filter((n) => !grounded.has(n));
  if (ungrounded.length === 0) return [];
  return [`ungrounded number(s): ${[...new Set(ungrounded)].join(", ")}`];
}

/** Voice rules: no em-dashes, no exclamation points, no hype words, and
 *  a calm length cap. Mirrors the locked AGENTS.md voice rules. */
function voiceClean(text: string): string[] {
  const reasons: string[] = [];
  if (text.includes("—")) reasons.push("contains em-dash");
  if (text.includes("!")) reasons.push("contains exclamation");
  const banned = text.match(BANNED_WORDS);
  if (banned) reasons.push(`hype word: ${banned[0]}`);
  for (const re of BANNED_PHRASES) {
    const m = text.match(re);
    if (m) {
      reasons.push(`sports-talk cliché: "${m[0]}"`);
      break; // one is enough to fail; don't spam the log
    }
  }
  if (text.trim().length === 0) reasons.push("empty");
  if (text.length > 240) reasons.push("too long");
  return reasons;
}

export function validateNarrative(
  text: string,
  facts: GameFacts
): ValidationResult {
  const reasons = [...numbersGrounded(text, facts), ...voiceClean(text)];
  return { ok: reasons.length === 0, reasons };
}
