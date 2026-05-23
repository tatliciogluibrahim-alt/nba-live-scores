"use client";

import { usePinned } from "../providers";
import { useWatchingData } from "./use-watching-data";
import { WatchingDashboard } from "./WatchingDashboard";
import { WatchingEmpty } from "./WatchingEmpty";

// Branches between empty state and dashboard based on the pinned list,
// not on whether the API has loaded. That way an empty user sees the
// calm empty state immediately, not a loading shell.

export function WatchingClient() {
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const { payload, hydrated: dataHydrated } = useWatchingData();

  if (!pinnedHydrated) {
    return <div className="min-h-[200px]" aria-busy aria-live="polite" />;
  }

  if (pinned.length === 0) {
    return <WatchingEmpty />;
  }

  // Have pins but data isn't here yet — show the dashboard with a calm
  // skeleton row. The list will fill in once the API responds.
  if (!dataHydrated) {
    return (
      <div className="space-y-2" aria-busy aria-live="polite">
        <div
          className="h-[140px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <div
          className="h-[120px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
      </div>
    );
  }

  return <WatchingDashboard payload={payload} />;
}
