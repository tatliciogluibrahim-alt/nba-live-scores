// Spoken names for game surfaces, for VoiceOver. The visible status line is
// agate shorthand ("Q1 2:34", "End Q3", "90'+6'") that a screen reader
// reads as letters and numbers, so links and rows that carry a game get a
// sentence instead (accessibility pass, 2026-10-11).
//
// No-Spoilers: a hidden game's name has no scores. Callers pass `hidden`
// from the same spoiler state that redacts the visible score.

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const last = n % 10;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
}

const CLOCK = "(\\d+:\\d{2}|\\d+\\.\\d)";

/** The compact status line as words: "Q1 2:34" → "1st quarter, 2:34 left". */
export function spokenStatus(text: string): string {
  const t = text.trim();
  if (!t) return "";

  let m = t.match(new RegExp(`^Q(\\d)\\s*(?:·\\s*)?${CLOCK}$`));
  if (m) return `${ordinal(+m[1])} quarter, ${m[2]} left`;

  m = t.match(new RegExp(`^(\\d*)OT\\s*(?:·\\s*)?${CLOCK}$`));
  if (m) {
    const n = m[1] ? +m[1] : 1;
    return `${n > 1 ? `${ordinal(n)} ` : ""}overtime, ${m[2]} left`;
  }

  if (/^(halftime|ht)$/i.test(t)) return "Halftime";

  m = t.match(/^End (?:Q(\d)|of (\d)(?:st|nd|rd|th))$/i);
  if (m) return `End of the ${ordinal(+(m[1] ?? m[2]))} quarter`;

  m = t.match(/^(\d+)'(?:\+(\d+)')?$/);
  if (m) return `${ordinal(+m[1])} minute${m[2] ? `, plus ${m[2]}` : ""}`;

  m = t.match(/^ET (\d+)'(?:\+(\d+)')?$/);
  if (m) return `Extra time, ${ordinal(+m[1])} minute${m[2] ? `, plus ${m[2]}` : ""}`;

  if (/^penalties$/i.test(t)) return "Penalty shootout";
  if (/^final\s*\/\s*ot$/i.test(t)) return "Final, after overtime";
  if (/^ft$/i.test(t)) return "Full time";
  if (/^aet$/i.test(t)) return "Full time, after extra time";
  if (/^pens$/i.test(t)) return "Full time, decided on penalties";
  return t;
}

/** Breaks and finals speak for themselves. A running clock gets "Live". */
function withState(state: "live" | "final" | "upcoming", phrase: string): string {
  if (state !== "live" || !phrase) return phrase;
  if (/^(Halftime|End of|Delayed|Penalty|Live$)/.test(phrase)) return phrase;
  return `Live, ${phrase}`;
}

function sentence(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /[.?]$/.test(t) ? t : `${t}.`;
}

/** One sentence per fact: the score line (or the matchup when there's no
 *  score to give), the status, then the action. */
export function gameAccessibleName(g: {
  sport: "nba" | "wc" | "nfl";
  awayName: string;
  homeName: string;
  awayScore: number | null;
  homeScore: number | null;
  state: "live" | "final" | "upcoming";
  statusText: string;
  hidden: boolean;
  action?: string;
}): string {
  const scored = !g.hidden && g.awayScore !== null && g.homeScore !== null;
  const joiner = g.sport === "wc" ? "vs" : "at";
  const parts = [
    scored
      ? `${g.awayName} ${g.awayScore}, ${g.homeName} ${g.homeScore}`
      : `${g.awayName} ${joiner} ${g.homeName}`,
    withState(g.state, spokenStatus(g.statusText)),
    g.hidden && g.state !== "upcoming" ? "Score hidden" : "",
    g.action ?? "",
  ];
  return parts.map(sentence).filter(Boolean).join(" ");
}

/** A scoring row: who scored, the play, the running score, when. */
export function scoringPlayLabel(p: {
  when: string;
  text: string;
  teamName: string | null;
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
}): string {
  const play = p.text.replace(/\b(\d+) Yds?\b/g, (_, n) => `${n} yard`);
  const parts = [
    p.teamName ?? "",
    play,
    `${p.awayName} ${p.awayScore}, ${p.homeName} ${p.homeScore}`,
    spokenStatus(p.when),
  ];
  return parts.map(sentence).filter(Boolean).join(" ");
}
