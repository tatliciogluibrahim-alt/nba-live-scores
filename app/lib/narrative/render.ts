import type { GameFacts, NarrativeMode, Signal } from "./types";

// Narrative renderer — the ONLY file that calls an LLM. Everything
// upstream (facts, significance, validation) is pure. The model is the
// final voice layer, never the brain: it receives a validated facts
// object and is told to rephrase, never to introduce a number, name, or
// outcome that isn't already there.
//
// Dependency-free: a direct fetch to the Anthropic Messages API, no SDK.
// Returns the generated line, or null on any failure / when the pilot is
// off / when no API key is set. Null always means "fall back to the
// deterministic template," so this can never break a surface.

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const TIMEOUT_MS = 12_000;

// Shared rules — identical across sports. Only the closing voice
// examples swap, so the cadence stays consistent while the references
// match the sport being described.
const SYSTEM_BASE = [
  "You write one short, calm line for a sports companion app.",
  "Voice: a smart friend who watched the game and texts you the single",
  "thing worth knowing. Plain, factual, grounded. Specific, not vague.",
  "Observation-led, not stat-line. No hype, no superlatives, no",
  "exclamation points, no em-dashes. One or two short sentences,",
  "under 240 characters total.",
  "",
  "Hard rules:",
  "- Use ONLY the names and numbers present in the facts JSON. Never",
  "  invent or infer a statistic, score, or outcome.",
  "- If a number isn't in the facts, do not write a number.",
  "- Be even-handed. A matchup has two sides; do not favor one team's",
  "  storyline over the other. If you cite a fact for one team, give the",
  "  other team equal footing when a comparable fact exists.",
  "- No second-guessing the reader, no 'don't miss', no 'trending'.",
  "",
  "Banned phrases — these are sports-talk-radio clichés that break the",
  "calm-companion voice. Never use them:",
  "  'handled their business', 'took care of', 'got the job done',",
  "  'business trip', 'punched their ticket', 'sent a message',",
  "  'statement win', 'made it look easy', 'put it away', 'survived',",
  "  'rolled', 'cruised', 'dominated', 'closed the door'.",
  "  Also no opinion words: 'impressive', 'huge', 'massive', 'epic',",
  "  'clutch', 'must-win', 'unstoppable'.",
  "",
].join("\n");

const NBA_EXAMPLES = [
  "Voice examples (style only — do not reuse these specific facts).",
  "These show the cadence: observation + one specific detail. Short.",
  "Calm but alive. Past tense for finals.",
  "  · 'San Antonio took it 111-103. First Finals since 2014.'",
  "  · 'Oklahoma City came back from 18. Ran out of clock.'",
  "  · 'Wembanyama had 32 and 12. Nobody had an answer.'",
  "  · 'Tight all night. New York found one more possession at the end.'",
  "  · 'Series is over. Spurs in five.'",
  "",
  "Return only the line, no preamble.",
].join("\n");

const WC_EXAMPLES = [
  "Voice examples (style only — do not reuse these specific facts).",
  "These show the cadence: observation + one specific detail. Short.",
  "Calm but alive. Past tense for finished matches. Soccer scores read",
  "away-then-home. Say 'match', not 'game'. 'GD' is goal difference.",
  "  · 'Mexico beat South Africa 2-0. Both from Gimenez.'",
  "  · 'Goalless in Group A. Spain and Uruguay take a point each.'",
  "  · 'Brazil are through to the Round of 32 after the 3-1.'",
  "  · 'Tight one. Switzerland edged Canada 1-0.'",
  "  · 'Five goals in Group D. Germany came out 3-2.'",
  "",
  "Return only the line, no preamble.",
].join("\n");

function systemPrompt(sport: GameFacts["sport"]): string {
  return SYSTEM_BASE + (sport === "wc" ? WC_EXAMPLES : NBA_EXAMPLES);
}

function buildUserPrompt(facts: GameFacts, signals: Signal[]): string {
  const lead = signals[0]?.kind ?? "routine";
  const factsJson =
    facts.sport === "wc"
      ? {
          away: facts.away,
          home: facts.home,
          winner: facts.winnerCode,
          margin: facts.margin,
          stage: facts.stage,
          scorers: facts.scorers ?? [],
          stake: facts.stakeLine,
        }
      : {
          away: facts.away,
          home: facts.home,
          winner: facts.winnerCode,
          margin: facts.margin,
          series: facts.seriesLine,
          topPerformer: facts.topPerformer,
        };
  return [
    `Lead the line with this angle: ${lead}.`,
    "Facts (the only source you may use):",
    JSON.stringify(factsJson, null, 2),
  ].join("\n");
}

export async function narrate(
  facts: GameFacts,
  signals: Signal[],
  mode: NarrativeMode
): Promise<string | null> {
  if (mode === "off") return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Overridable so the operator can pin the exact current Haiku id
  // without a code change.
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
        max_tokens: 120,
        temperature: 0.4,
        system: systemPrompt(facts.sport),
        messages: [{ role: "user", content: buildUserPrompt(facts, signals) }],
      }),
    });
    if (!res.ok) {
      console.warn("[narrative] generation failed", { status: res.status });
      return null;
    }
    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.warn("[narrative] generation error", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
