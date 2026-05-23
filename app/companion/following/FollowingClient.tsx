"use client";

import { useFollows } from "../providers";
import { FollowingDashboard } from "./FollowingDashboard";
import { FollowingEmpty } from "./FollowingEmpty";

// Routes between empty state and dashboard. Hydration-safe: while follows
// state is still loading from localStorage, render an invisible spacer so
// we don't flash the wrong state.

export function FollowingClient() {
  const { follows, hydrated } = useFollows();

  if (!hydrated) {
    return <div className="min-h-[200px]" aria-busy aria-live="polite" />;
  }

  return follows.length === 0 ? <FollowingEmpty /> : <FollowingDashboard />;
}
