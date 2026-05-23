// Isolated localStorage wrapper. All keys are namespaced under `no-noise:*:v1`
// so v2 migrations and server-prefs swaps can target them surgically.
//
// SSR-safe: every accessor guards `typeof window`. Reads/writes are wrapped
// in try/catch — localStorage can throw in private mode or when quota is full,
// and we never want a storage error to break a render.

const NS = "no-noise";
const VERSION = "v1";

export const STORAGE_KEYS = {
  follows: `${NS}:follows:${VERSION}`,
  pinned: `${NS}:pinned:${VERSION}`,
  prefs: `${NS}:prefs:${VERSION}`,
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent — quota, private mode, etc. */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* silent */
  }
}
