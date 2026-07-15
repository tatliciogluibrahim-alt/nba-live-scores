// A settings-panel permission grant happens outside the global APNs
// bootstrap's React state. This tiny window event lets the panel ask the
// already-mounted bootstrap to re-check permission, attach listeners, and
// register in the correct order.
export const NATIVE_PUSH_PERMISSION_CHANGED_EVENT =
  "no-noise:native-push-permission-changed";

export function notifyNativePushPermissionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NATIVE_PUSH_PERMISSION_CHANGED_EVENT));
}
