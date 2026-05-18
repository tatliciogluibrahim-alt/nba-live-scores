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

export function getLocalDateKey(date: string) {
  const gameDate = new Date(date);
  const year = gameDate.getFullYear();
  const month = String(gameDate.getMonth() + 1).padStart(2, "0");
  const day = String(gameDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getScoreboardToday() {
  const now = new Date();
  const scoreboardToday = new Date(now);

  if (now.getHours() < 5) {
    scoreboardToday.setDate(scoreboardToday.getDate() - 1);
  }

  return scoreboardToday;
}

export function isSameScoreboardDay(gameDate: Date, scoreboardDate: Date) {
  return (
    gameDate.getFullYear() === scoreboardDate.getFullYear() &&
    gameDate.getMonth() === scoreboardDate.getMonth() &&
    gameDate.getDate() === scoreboardDate.getDate()
  );
}

export function isTomorrow(date: Date) {
  const scoreboardTomorrow = getScoreboardToday();
  scoreboardTomorrow.setDate(scoreboardTomorrow.getDate() + 1);

  return isSameScoreboardDay(date, scoreboardTomorrow);
}
