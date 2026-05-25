import type { PushSubscriptionJSON } from "./web-push-types";

export type ValidPushSubscription = PushSubscriptionJSON & {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type ValidationResult =
  | { ok: true; subscription: ValidPushSubscription }
  | { ok: false; error: string };

const MAX_ENDPOINT_LENGTH = 2048;
const P256DH_BYTES = 65;
const AUTH_BYTES = 16;

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return null;
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  try {
    const decoded = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function validatePushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string") return false;
  if (endpoint.length === 0 || endpoint.length > MAX_ENDPOINT_LENGTH) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePushSubscription(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Subscription must be an object." };
  }

  const candidate = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  if (!validatePushEndpoint(candidate.endpoint)) {
    return { ok: false, error: "Subscription endpoint must be a valid HTTPS URL." };
  }

  const p256dh = candidate.keys?.p256dh;
  const auth = candidate.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return { ok: false, error: "Subscription keys are missing." };
  }

  const p256dhBytes = decodeBase64Url(p256dh);
  const authBytes = decodeBase64Url(auth);
  if (!p256dhBytes || p256dhBytes.length !== P256DH_BYTES) {
    return { ok: false, error: "Subscription p256dh key is invalid." };
  }
  if (!authBytes || authBytes.length !== AUTH_BYTES) {
    return { ok: false, error: "Subscription auth key is invalid." };
  }

  return {
    ok: true,
    subscription: {
      endpoint: candidate.endpoint,
      keys: { p256dh, auth },
    },
  };
}
