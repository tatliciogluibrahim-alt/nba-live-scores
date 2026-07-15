export type NativeNotificationData = {
  type?: unknown;
  gameId?: unknown;
  url?: unknown;
};

/** Resolve an APNs tap to a same-app path. The sender uses relative URLs;
 * rejecting protocol-relative/absolute values keeps custom push data from
 * becoming an open redirect. Older offer payloads did not include `url`, so
 * gameId remains a backward-compatible fallback. */
export function nativeNotificationPath(
  data: NativeNotificationData | null | undefined
): string | null {
  const raw = typeof data?.url === "string" ? data.url.trim() : "";
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    try {
      const parsed = new URL(raw, "https://nonoisescores.app");
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      // Fall through to the older gameId payload.
    }
  }

  const gameId =
    typeof data?.gameId === "string" ? data.gameId.trim() : "";
  return gameId ? `/game/${encodeURIComponent(gameId)}` : null;
}

export function isLiveActivityOffer(
  data: NativeNotificationData | null | undefined
): data is NativeNotificationData & { type: "live-activity-offer"; gameId: string } {
  return (
    data?.type === "live-activity-offer" &&
    typeof data.gameId === "string" &&
    data.gameId.trim().length > 0
  );
}
