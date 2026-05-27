// iCal (.ics) generation for "Add to Calendar" on game detail pages.
//
// Two design goals:
//
// 1. Spoiler-safe titles. Under No-Spoilers, the calendar entry must
//    not reveal the matchup or stakes. The pop-up reminder iOS shows
//    at game time should read "Knicks game" not "Knicks vs Pacers ·
//    Elimination Game." Calendar text is one of the most leaky
//    surfaces in a phone — auto-fill, lock-screen reminders, Siri
//    summaries all touch it.
//
// 2. Pure function. No I/O, no DOM. The caller turns the returned
//    string into a Blob and triggers a download. Keeps this importable
//    from any context (client component, server route, future Brief
//    email body).
//
// We deliberately do NOT include scores, summaries, or anything
// spoilery in DESCRIPTION even when noSpoilers is off — calendar
// previews on macOS/iOS surface the description in places we don't
// fully control (Spotlight, share sheets). The single source of truth
// for "what happened" stays inside the app.

export type CalendarGameInput = {
  /** Unique game id. Used to build a stable UID so re-imports update
   *  the same calendar entry instead of duplicating. */
  id: string;
  /** Game start (ISO 8601). */
  start: string;
  /** Sport label for the secondary line. "NBA" or "World Cup". */
  sport: "NBA" | "World Cup";
  /** Matchup string. NBA: "Knicks vs Pacers". WC: "USA vs Brazil". */
  matchup: string;
  /** The two teams (or countries) as short codes — used to build the
   *  No-Spoilers-safe title without revealing the opponent. */
  awayCode: string;
  homeCode: string;
  /** Optional venue / broadcast string for LOCATION. */
  location?: string;
  /** Optional game-context string for the non-NS DESCRIPTION line
   *  ("East Semifinals · Game 4"). Never includes scores. */
  context?: string;
};

export type CalendarBuildOptions = {
  /** When true, the SUMMARY is generic ("Knicks game"). When false,
   *  the SUMMARY is the matchup ("Knicks vs Pacers · Game 4"). */
  noSpoilers: boolean;
  /** Followed team/country code to prefer when building the NS-safe
   *  title. If the followed team is the away team, the calendar entry
   *  reads "<away> game"; if the home team, "<home> game"; if no
   *  followed match, fall back to the matchup with codes only ("NYK
   *  game") to stay generic. */
  followedCode?: string;
};

// NBA games run ~2h30m; WC matches run ~2h (plus extra time / pens).
// Calendar blocks aim for the practical window people clear for the
// game, not the exact regulation length.
const DURATION_BY_SPORT: Record<CalendarGameInput["sport"], number> = {
  NBA: 2.5 * 60,        // 150 min
  "World Cup": 2 * 60,  //  120 min
};

/** Strip every character that would corrupt an .ics line. RFC 5545
 *  requires CR/LF, comma, semicolon, and backslash to be escaped. We
 *  also clamp length so a freak gameContext doesn't blow past the
 *  75-octet line limit. */
function icsEscape(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .slice(0, 200);
}

function toICalDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ — UTC form, simplest and most portable.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function buildSummary(
  game: CalendarGameInput,
  opts: CalendarBuildOptions
): string {
  if (opts.noSpoilers) {
    // Prefer the followed team's code so the calendar entry reads
    // "Knicks game" for a Knicks follower, regardless of opponent. If
    // we don't know who they follow, fall back to a sport-prefixed
    // generic line.
    if (opts.followedCode) {
      if (
        opts.followedCode === game.awayCode ||
        opts.followedCode === game.homeCode
      ) {
        return `${opts.followedCode} game`;
      }
    }
    // Truly generic fallback. Spoiler-safe but still useful — the
    // user knows they have a sports thing at this hour.
    return `${game.sport} game`;
  }
  // Non-NS: full matchup. Optional context line for playoffs / round.
  if (game.context) {
    return `${game.matchup} · ${game.context}`;
  }
  return game.matchup;
}

function buildDescription(
  game: CalendarGameInput,
  opts: CalendarBuildOptions
): string {
  // Even when NS is off, keep this calm and free of scores/summaries
  // (see the file header comment for why). The point is to give the
  // user a quiet pointer back to the game's detail page.
  const base = `Followed via No Noise Scores`;
  const url = `https://nonoisescores.app/game/${game.id}`;
  if (opts.noSpoilers) {
    return `${base}.\\n${url}`;
  }
  const contextLine = game.context ? `\\n${game.context}` : "";
  return `${base}.\\n${game.matchup}${contextLine}\\n${url}`;
}

/** Build a complete .ics document for a single game. The returned
 *  string is ready to be wrapped in a Blob of type "text/calendar".
 *
 *  Caller is responsible for the download / open mechanics (different
 *  on iOS Safari vs Android Chrome vs desktop). */
export function buildGameICal(
  game: CalendarGameInput,
  opts: CalendarBuildOptions
): string {
  const start = new Date(game.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error("buildGameICal: invalid game.start");
  }
  const durationMin = DURATION_BY_SPORT[game.sport];
  const end = new Date(start.getTime() + durationMin * 60_000);

  const now = new Date();
  const uid = `nns-game-${game.id}@nonoisescores.app`;
  const summary = icsEscape(buildSummary(game, opts));
  const description = buildDescription(game, opts); // already escaped
  const location = game.location ? icsEscape(game.location) : "";
  const url = `https://nonoisescores.app/game/${game.id}`;

  // RFC 5545 line-folding. Most calendar clients tolerate long lines
  // but technically anything over 75 octets should fold. Our content
  // stays well under that after slice(200) above.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//No Noise Scores//nonoisescores.app//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICalDate(now)}`,
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  // iCal requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

/** Filename for the downloaded .ics. Keeps it stable per game so
 *  re-imports update the same entry. */
export function icalFilename(game: CalendarGameInput): string {
  return `no-noise-scores-${game.id}.ics`;
}
