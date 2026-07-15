import { parseScheduleRoute, scheduleHref } from "../schedule/schedule-route";

export type GameOrigin = "today" | "schedule" | "watching";

export type GameBackTarget = {
  href: string;
  label: "Today" | "Schedule" | "Watching";
};

const BACK_TARGETS: Record<GameOrigin, GameBackTarget> = {
  // `/app` is the explicit app entry at every width. `/` can resolve to the
  // marketing site for a desktop user, so it is not a safe detail fallback.
  today: { href: "/app", label: "Today" },
  schedule: { href: "/schedule", label: "Schedule" },
  watching: { href: "/watching", label: "Watching" },
};

export function parseGameOrigin(
  value: string | string[] | undefined
): GameOrigin | null {
  if (typeof value !== "string") return null;
  return value === "today" || value === "schedule" || value === "watching"
    ? value
    : null;
}

/**
 * Add a validated source to an internal game-detail link. Non-game links are
 * returned unchanged so callers can safely use this at mixed-link seams.
 * Existing query parameters (for example the Live Activity offer) and hashes
 * are preserved.
 */
export function parseGameReturnTo(
  value: string | string[] | undefined,
  origin: GameOrigin | null
): string | null {
  if (origin !== "schedule" || typeof value !== "string") return null;
  if (!value.startsWith("/schedule") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, "https://nonoisescores.app");
    if (url.origin !== "https://nonoisescores.app" || url.pathname !== "/schedule") {
      return null;
    }
    return scheduleHref(
      parseScheduleRoute({
        scope: url.searchParams.get("scope") ?? undefined,
        competition: url.searchParams.get("competition") ?? undefined,
        view: url.searchParams.get("view") ?? undefined,
      }),
      {}
    );
  } catch {
    return null;
  }
}

export function withGameOrigin(
  href: string,
  origin?: GameOrigin,
  returnTo?: string
): string {
  if (!origin) return href;

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (!/^\/game\/[^/]+$/.test(pathname)) return href;

  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  params.set("from", origin);
  const safeReturnTo = parseGameReturnTo(returnTo, origin);
  if (safeReturnTo) params.set("returnTo", safeReturnTo);
  else params.delete("returnTo");
  return `${pathname}?${params.toString()}${hash}`;
}

export function gameBackTarget(
  origin: GameOrigin | null,
  returnTo?: string | string[]
): GameBackTarget {
  const safeReturnTo = parseGameReturnTo(returnTo, origin);
  if (origin === "schedule" && safeReturnTo) {
    return { href: safeReturnTo, label: "Schedule" };
  }
  return origin ? BACK_TARGETS[origin] : BACK_TARGETS.today;
}
