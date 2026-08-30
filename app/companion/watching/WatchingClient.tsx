"use client";

import { PullToRefresh } from "../atoms/PullToRefresh";
import { usePinned } from "../providers";
import { useWatchingData } from "./use-watching-data";
import { WatchingDashboard } from "./WatchingDashboard";
import { WatchingEmpty } from "./WatchingEmpty";

// Branches between empty state and dashboard based on the pinned list,
// not on whether the API has loaded. That way an empty user sees the
// calm empty state immediately, not a loading shell.

export function WatchingClient() {
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const { payload, hydrated: dataHydrated, refetch } = useWatchingData();

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
          className="no-noise-pulse h-[140px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <div
          className="no-noise-pulse h-[120px] rounded-[14px]"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            animationDelay: "0.2s",
          }}
        />
      </div>
    );
  }

  // Courtside C3: Watching is an arena room only while something tracked
  // is actually live — a review finding killed the always-dark version
  // (dark with nothing live read as surface-dark, not state-dark).
  const arenaLive = payload.items.some((i) => i.status === "live");

  return (
    <div
      data-chassis={arenaLive ? "arena" : undefined}
      className="nns-room -mx-4 px-4 md:mx-0 md:px-0"
    >
      <PullToRefresh onRefresh={refetch}>
        <WatchingDashboard payload={payload} />
      </PullToRefresh>
    </div>
  );
}
