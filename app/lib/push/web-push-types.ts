// Re-export of the browser's PushSubscriptionJSON shape so server code
// can type-check incoming payloads without importing DOM lib types.
// Mirrors the W3C Push API JSON form.

export type PushSubscriptionJSON = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};
