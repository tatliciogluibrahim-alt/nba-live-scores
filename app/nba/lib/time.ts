export function formatGameDateTime(date: string) {
  const gameDate = new Date(date);

  return `${gameDate.toLocaleDateString([], {
    weekday: "short",
  })} • ${gameDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function formatGameTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLastUpdated(updatedAt: Date | null) {
  if (!updatedAt) return "Updating scores";

  const diffMs = Date.now() - updatedAt.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes === 1) return "Updated 1 min ago";

  return `Updated ${diffMinutes} min ago`;
}

export function formatCountdown(targetDate: string) {
  const diffMs = new Date(targetDate).getTime() - Date.now();

  if (diffMs <= 0) return "Starting soon";

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);

  if (totalMinutes < 5) {
    const totalSeconds = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `Starts in ${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `Starts in ${m}:${String(s).padStart(2, "0")}`;
  }

  if (totalMinutes < 60) return `In ${totalMinutes} min`;

  if (totalHours < 6) return `In ${totalHours} ${totalHours === 1 ? "hr" : "hrs"}`;

  return `Tonight · ${formatGameTime(targetDate)}`;
}

// The "scoreboard day" is the US Eastern sports day, with a 5am ET
// rollover so late games (which tip after midnight UTC / late ET) still
// belong to the night they were played. We compute every date part in
// America/New_York so the day math is correct regardless of the viewer's
// device timezone (a PT or European user would otherwise see "today's
// games" shift by a day at the wrong wall-clock moment). The algorithm
// is unchanged from the original local-time version — only the parts are
// now ET, so the behavior is identical for an ET user.
const SPORTS_TZ = "America/New_York";

/** ET calendar date as a comparable "YYYY-MM-DD" key (en-CA → ISO order). */
function etDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: SPORTS_TZ });
}

/** Hour of day (0–23) in ET. */
function etHour(d: Date): number {
  return Number(
    d.toLocaleString("en-US", {
      timeZone: SPORTS_TZ,
      hour: "2-digit",
      hour12: false,
    })
  );
}

export function getLocalDateKey(date: string) {
  return etDateKey(new Date(date));
}

export function getScoreboardToday() {
  const now = new Date();
  // Before 5am ET, "today's" scoreboard is still last night's slate.
  // Subtract a full 24h (DST-safe) rather than a calendar day.
  return etHour(now) < 5 ? new Date(now.getTime() - 86_400_000) : now;
}

export function isSameScoreboardDay(gameDate: Date, scoreboardDate: Date) {
  return etDateKey(gameDate) === etDateKey(scoreboardDate);
}

export function isTomorrow(date: Date) {
  const scoreboardTomorrow = new Date(
    getScoreboardToday().getTime() + 86_400_000
  );
  return isSameScoreboardDay(date, scoreboardTomorrow);
}
