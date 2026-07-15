// A denial should not be followed immediately by a recovery ask on the same
// visit. This in-memory flag resets on a cold app/web load, so recovery can
// return calmly next session without becoming a permanent dismissal.
let deniedThisSession = false;

export function markPushPermissionDeniedThisSession(): void {
  deniedThisSession = true;
}

export function wasPushPermissionDeniedThisSession(): boolean {
  return deniedThisSession;
}

