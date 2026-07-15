import type { PushEvent } from "./event-detector";

// LLM push copy (significance engine C4). Phrases the BODY line of a
// notification in the calm-companion voice, grounded in the event's facts.
// Self-contained (a direct Anthropic fetch, no SDK), mirroring
// app/lib/narrative/render.ts but push-tuned: shorter output, a tighter
// timeout, and a hard grounded-number guard.
//
// SAFETY (this is the most critical path — a lock-screen ping):
//   • Enabled by default when ANTHROPIC_API_KEY is set (2026-07-14: turned
//     on). Kill switch — set PUSH_NARRATE=0 to force every alert back to the
//     deterministic templates instantly, no deploy needed for the flag once
//     it's a Vercel env var. Without a key it stays off.
//   • Timeout — 2.5s; any timeout/error returns null.
//   • Grounded — the model may only use the names/numbers in the facts; the
//     output is rejected (→ null) if it contains any integer not in the
//     allowed set. No fabricated stat ever reaches a lock screen.
//   • null ALWAYS means "use the template." This can never break a push.
//   • Spoiler variant only — No-Spoilers users keep the calm templates, so
//     the model never sees a score it could leak.

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const TIMEOUT_MS = 2500;
const MAX_BODY_CHARS = 120;

/** On by default when a key is present; kill with PUSH_NARRATE=0. */
export function pushNarrateEnabled(): boolean {
  return (
    process.env.PUSH_NARRATE !== "0" && Boolean(process.env.ANTHROPIC_API_KEY)
  );
}

export type PushNarrationInput = {
  type: PushEvent["type"];
  away: string;
  home: string;
  awayScore: number;
  homeScore: number;
  /** WC stage / round label. */
  stage?: string;
  /** WC goal scorer. */
  scorer?: string;
};

const SYSTEM = [
  "You write the one-line body of a sports push notification for a calm",
  "companion app. One short sentence, under 90 characters. Plain, factual,",
  "grounded, specific. No hype, no exclamation points, no em-dashes.",
  "Soccer scores read away-then-home; say 'match', not 'game'.",
  "",
  "TENSE IS CRITICAL. Only a full-time / final event describes a RESULT. For a",
  "match still in progress (a goal, kickoff, halftime, the second half), use the",
  "PRESENT tense and describe the LIVE state, never a finished result. A goal",
  "names the scorer, the current score, and who leads or that it is level —",
  "e.g. 'A. Gordon puts England ahead 1-0.' or 'Goal: England lead 1-0, A.",
  "Gordon.' If it is 0-0 or level after a goal was disallowed, say 'level'.",
  "NEVER write 'beat', 'won', 'wins', 'defeated', 'edged', 'sealed', 'held",
  "off', 'through', 'advance', 'eliminated', 'champions', or any result verb",
  "unless the state is final.",
  "",
  "Banned (sports-radio clichés / opinion words): 'handled business',",
  "'statement', 'took care of', 'punched their ticket', 'survived',",
  "'cruised', 'dominated', 'clutch', 'huge', 'massive', 'must-win'.",
  "Use ONLY the names and numbers in the facts. Never invent a number,",
  "score, or outcome. Return only the line, no preamble.",
].join("\n");

// Events whose state is FINISHED — the only ones allowed to describe a result.
const FINAL_EVENTS = new Set(["final", "wc-final"]);

// Result verbs that imply a finished match. Rejected on in-progress events —
// "England beat Argentina 1-0" on a live goal reads as full time (the bug this
// guards, 2026-07-15). Deterministic backstop to the prompt: a slip falls back
// to the safe template rather than a misleading lock-screen line.
const RESULT_VERB_RE =
  /\b(beat(?:en)?|won|wins?|defeat(?:ed|s)?|def\.|edg(?:e|ed|es)|held? off|seal(?:ed|s)?|clinch(?:ed|es)?|knock(?:ed)? out|eliminat(?:e|ed|es)|advanc(?:e|ed|es)|through to|champions?|lift(?:ed|s)?|title)\b/i;

/** True unless the text uses a finished-match result verb on an event that is
 *  still in progress. Pure — exported for tests. */
export function bodyTenseOk(text: string, type: string): boolean {
  if (FINAL_EVENTS.has(type)) return true;
  return !RESULT_VERB_RE.test(text);
}

/** The only integers the model is allowed to write back. */
function allowedNumbers(i: PushNarrationInput): Set<number> {
  return new Set([i.awayScore, i.homeScore]);
}

/** True when every integer in the text is a grounded fact. Pure — exported
 *  for tests. */
export function bodyIsGrounded(text: string, i: PushNarrationInput): boolean {
  const nums = (text.match(/\d+/g) ?? []).map(Number);
  const allowed = allowedNumbers(i);
  return nums.every((n) => allowed.has(n));
}

function factsJson(i: PushNarrationInput): string {
  return JSON.stringify({
    away: i.away,
    home: i.home,
    awayScore: i.awayScore,
    homeScore: i.homeScore,
    ...(i.stage ? { stage: i.stage } : {}),
    ...(i.scorer ? { scorer: i.scorer } : {}),
  });
}

/** Phrase the spoiler body for a push event. Returns the line, or null on
 *  any failure / when the kill switch is off / when the output isn't
 *  grounded — the caller then uses its deterministic template. */
export async function narratePush(
  i: PushNarrationInput
): Promise<string | null> {
  if (!pushNarrateEnabled()) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY as string;
  const model = (process.env.NARRATIVE_MODEL ?? "claude-haiku-4-5").trim();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        temperature: 0.3,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Event: ${i.type}\nState: ${
              FINAL_EVENTS.has(i.type)
                ? "final (a result)"
                : "in progress — do NOT describe a finished result; present tense only"
            }\nFacts:\n${factsJson(i)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text || text.length > MAX_BODY_CHARS) return null;
    if (!bodyIsGrounded(text, i)) return null;
    // Reject a finished-result verb on a still-live event → safe template.
    if (!bodyTenseOk(text, i.type)) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
