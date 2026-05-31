// Push-registration state + retry helper.
//
// The two native registration POSTs (regular APNs in CapacitorPushBootstrap
// and per-Activity Live Activity tokens in LiveActivitySync) used to
// console.warn on failure and silently move on. Mid-game we discovered the
// real-world failure mode: WKWebView fetches during cold launch or network
// flapping silently fail, and the user gets neither push nor Live Activity
// updates with no visible signal anywhere.
//
// This module replaces those silent failures with:
//   1. Bounded retry with exponential backoff (handles transient network /
//      WKWebView issues during cold launch).
//   2. A small localStorage state blob recording the last attempt for each
//      kind (apns / live-activity) so the Settings panel can show what
//      actually happened, and a power-user can inspect via the JS console.
//   3. Per-kind in-flight guards so multiple concurrent triggers don't fan
//      out parallel POSTs.

const STATE_KEY_PREFIX = "nns:push-register-state:v1:";

export type RegisterKind = "apns" | "live-activity";

export type RegisterStatus =
  | "ok"
  | "fetch-failed"
  | "http-error"
  | "exception";

export type RegisterState = {
  kind: RegisterKind;
  status: RegisterStatus;
  attemptedAt: number;
  /** HTTP status (when http-error). */
  httpStatus?: number;
  /** Server response body when status is http-error or last error text. */
  detail?: string;
  /** Token prefix (first 12 hex chars) — never the full token. */
  tokenPrefix?: string;
};

function storageKey(kind: RegisterKind): string {
  return `${STATE_KEY_PREFIX}${kind}`;
}

export function readRegisterState(kind: RegisterKind): RegisterState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(kind));
    if (!raw) return null;
    return JSON.parse(raw) as RegisterState;
  } catch {
    return null;
  }
}

export function writeRegisterState(state: RegisterState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(state.kind), JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

export function clearRegisterState(kind: RegisterKind): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey(kind));
  } catch {
    /* best-effort */
  }
}

/** Truncate a token to a stable 12-char prefix for diagnostics. Never log
 *  full tokens — they're credentials. */
export function tokenPrefix(token: string | null | undefined): string | undefined {
  if (!token) return undefined;
  return token.slice(0, 12);
}

/** POST with retry, JSON body, and state persistence. Returns the final
 *  state so the caller can react. Never throws. */
export async function postWithRetry(args: {
  kind: RegisterKind;
  endpoint: string;
  body: unknown;
  token: string;
  /** Max attempts including the first. Default 4. */
  attempts?: number;
  /** Base delay in ms for exponential backoff. Default 1000. */
  baseDelayMs?: number;
}): Promise<RegisterState> {
  const {
    kind,
    endpoint,
    body,
    token,
    attempts = 4,
    baseDelayMs = 1000,
  } = args;
  const prefix = tokenPrefix(token);
  let lastState: RegisterState = {
    kind,
    status: "exception",
    attemptedAt: Date.now(),
    tokenPrefix: prefix,
    detail: "no attempts made",
  };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text().catch(() => "");
      if (res.ok) {
        lastState = {
          kind,
          status: "ok",
          attemptedAt: Date.now(),
          tokenPrefix: prefix,
        };
        writeRegisterState(lastState);
        console.log(`[push-register:${kind}] OK attempt ${attempt}`, {
          prefix,
        });
        return lastState;
      }
      lastState = {
        kind,
        status: "http-error",
        attemptedAt: Date.now(),
        httpStatus: res.status,
        detail: text.slice(0, 240),
        tokenPrefix: prefix,
      };
      console.warn(
        `[push-register:${kind}] HTTP ${res.status} attempt ${attempt}`,
        text.slice(0, 240)
      );
      // 4xx other than 429 won't recover by retrying — break early.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        writeRegisterState(lastState);
        return lastState;
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      lastState = {
        kind,
        status: "fetch-failed",
        attemptedAt: Date.now(),
        detail,
        tokenPrefix: prefix,
      };
      console.warn(
        `[push-register:${kind}] fetch threw attempt ${attempt}`,
        detail
      );
    }
    if (attempt < attempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  writeRegisterState(lastState);
  return lastState;
}
