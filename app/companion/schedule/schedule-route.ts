import type { ScheduleView } from "./competitions";

export type ScheduleRouteState = {
  scope: "following" | "all";
  competition: string | null;
  view: ScheduleView | null;
};

type QueryValue = string | string[] | undefined;

function single(value: QueryValue): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isScheduleView(value: string | null): value is ScheduleView {
  return value === "byday" || value === "bracket" || value === "groups";
}

export function parseScheduleRoute(query: {
  scope?: QueryValue;
  competition?: QueryValue;
  view?: QueryValue;
}): ScheduleRouteState {
  const view = single(query.view);
  return {
    scope: single(query.scope) === "all" ? "all" : "following",
    competition: single(query.competition),
    view: isScheduleView(view) ? view : null,
  };
}

export function scheduleHref(
  current: ScheduleRouteState,
  patch: Partial<ScheduleRouteState>
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.scope === "all") params.set("scope", "all");
  if (next.competition) params.set("competition", next.competition);
  if (next.view && next.view !== "byday") params.set("view", next.view);

  const query = params.toString();
  return query ? `/schedule?${query}` : "/schedule";
}
