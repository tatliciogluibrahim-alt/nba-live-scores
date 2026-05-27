"use client";

import { useCallback, useMemo, useState } from "react";
import { useFollows, useNoSpoilers } from "../providers";
import {
  buildGameICal,
  icalFilename,
  type CalendarGameInput,
} from "../../lib/calendar/ics";

// "Add to calendar" button for upcoming game detail pages.
//
// Behavior:
//   • Generates a Blob (.ics) and triggers a download on tap. On iOS
//     Safari the Files app handles the open-in-Calendar handoff; on
//     desktop and Android Chrome the same flow imports cleanly.
//   • Title is spoiler-safe under No-Spoilers (e.g. "Knicks game"
//     instead of "Knicks vs Pacers · Game 4"). See lib/calendar/ics.ts
//     for the rules.
//   • One-tap, transient "Added" confirmation for 2s so the user knows
//     the download fired.
//
// The button is intentionally low-volume — a single text/icon row, not
// a primary CTA. It sits next to other quiet utilities on the game
// detail page (pin / share). The pin button is the loud one because
// it changes app behavior; calendar is opt-in and dormant.
//
// Note on visibility: callers are responsible for only rendering this
// button for upcoming games (a calendar entry for a final game is a
// UX bug). We don't gate inside this component because reading
// Date.now() in render violates the React 19 purity rule, and parents
// already know the game status.

export function AddToCalendarButton({
  game,
}: {
  game: CalendarGameInput;
}) {
  const noSpoilers = useNoSpoilers();
  const { follows } = useFollows();
  const [confirmed, setConfirmed] = useState(false);

  // Pick a followed-team code that participates in this game, so the
  // NS-safe title can read "<followed> game" instead of the generic
  // "NBA game". Order doesn't matter — at most one of away/home will
  // match the user's follows in practice.
  const followedCode = useMemo(() => {
    for (const f of follows) {
      if (f.kind === "team" && (f.id === game.awayCode || f.id === game.homeCode)) {
        return f.id;
      }
      if (f.kind === "country" && (f.id === game.awayCode || f.id === game.homeCode)) {
        return f.id;
      }
    }
    return undefined;
  }, [follows, game.awayCode, game.homeCode]);

  const handleClick = useCallback(() => {
    try {
      const ics = buildGameICal(game, { noSpoilers, followedCode });
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = icalFilename(game);
      // Some iOS Safari versions need the anchor in the DOM briefly.
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so Safari has time to read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 2000);
    } catch {
      // Failures here are rare (invalid date) and we don't want to
      // bother the user with an error toast for an opt-in feature.
      // The button just no-ops.
    }
  }, [game, noSpoilers, followedCode]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition active:scale-[0.97]"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        color: confirmed ? "var(--ink-1)" : "var(--mute-1)",
        fontSize: 12,
        fontWeight: 600,
      }}
      aria-label={
        confirmed
          ? "Calendar file downloaded"
          : "Add this game to your calendar"
      }
    >
      <span aria-hidden style={{ fontSize: 13 }}>
        {confirmed ? "✓" : "📅"}
      </span>
      <span>{confirmed ? "Added" : "Add to calendar"}</span>
    </button>
  );
}
