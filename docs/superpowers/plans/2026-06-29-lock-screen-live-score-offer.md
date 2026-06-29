# Lock-screen live-score offer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At kickoff/tipoff of a followed game, send eligible iOS users a notification whose tap pins the game and drops a Live Activity onto their lock screen, with no added notification volume.

**Architecture:** No new event. At APNs fanout time the dispatcher chooses, per recipient, between the normal start push and an "offer" variant carrying `data = { type: "live-activity-offer", gameId, sport }`. The offer replaces the plain start push for eligible iOS recipients, so volume stays flat. On tap, the web layer pins the game and the already-shipped `LiveActivitySync` poll starts and maintains the tile. A default-on `lockScreenOffers` preference gates the variant.

**Tech Stack:** Next.js (App Router) + React 19 + TypeScript, Capacitor 8 (@capacitor/push-notifications), Vercel KV, APNs (jose + undici), Vitest.

## Global Constraints

- Voice: plain, calm, sentence case. No em-dashes in user-facing copy (use periods/commas/parentheses). Em-dashes allowed in code comments.
- Live Activities are iOS-only; the offer variant must never reach web push (VAPID) recipients.
- The offer must never double up with the plain start push: exactly one APNs payload per recipient per start event.
- `lockScreenOffers` defaults to ON (`true`) everywhere it is read when the value is absent/undefined.
- Offer copy is spoiler-safe by construction (fires at 0-0); never include a score.
- Internal alert tier keys unchanged: `quiet | companion | all`.
- Do not alter unrelated pages or remove features. Keep changes targeted (project AGENTS.md coding rule).
- Gate to ship: `npm run lint` (0 warnings) then `npm run build` then `npm run test`.

---

### Task 1: Offer eligibility + payload + data builders (pure, in dispatcher)

**Files:**
- Modify: `app/lib/push/dispatcher.ts`
- Test: `app/lib/push/dispatcher.test.ts`

**Interfaces:**
- Consumes: `PushEvent` from `./event-detector`, `PushPayload` from `./web-push-config`, `isWCEvent` (already in dispatcher.ts).
- Produces:
  - `isStartEvent(event: PushEvent): boolean` — true for `"tipoff"` and `"wc-kickoff"`.
  - `buildLiveActivityOfferPayload(event: PushEvent): PushPayload` — title = `"AWAY vs HOME"`, subtitle = `"Starting now"`, body = `"Tap to add the live score to your lock screen."`, url = `"/game/{id}?offer=live-activity"`, tag = the same start tag the normal payload uses (`{id}:tipoff` or `{id}:wc-kickoff`).
  - `liveActivityOfferData(event: PushEvent): Record<string, string>` — `{ type: "live-activity-offer", gameId, sport }` where `sport` is `"wc"` for WC events else `"nba"`.

- [ ] **Step 1: Write the failing tests**

Add to the end of `app/lib/push/dispatcher.test.ts` (the file already imports `subscriberWantsEvent`, `PushEvent`, and has an `nbaEvent` helper; add the new imports to the existing top import line from `./dispatcher`):

```typescript
import {
  subscriberWantsEvent,
  isStartEvent,
  buildLiveActivityOfferPayload,
  liveActivityOfferData,
} from "./dispatcher";

// ... existing tests stay ...

describe("live-activity offer builders", () => {
  function wcEvent(over: Partial<PushEvent> = {}): PushEvent {
    return {
      type: "wc-kickoff",
      gameId: "wc1",
      awayCode: "BRA",
      homeCode: "JPN",
      awayScore: 0,
      homeScore: 0,
      ...over,
    };
  }

  it("treats tipoff and wc-kickoff as start events", () => {
    expect(isStartEvent(nbaEvent({ type: "tipoff" }))).toBe(true);
    expect(isStartEvent(wcEvent())).toBe(true);
  });

  it("does not treat non-start events as start events", () => {
    expect(isStartEvent(nbaEvent({ type: "final" }))).toBe(false);
    expect(isStartEvent(nbaEvent({ type: "close-game" }))).toBe(false);
    expect(isStartEvent(wcEvent({ type: "wc-goal" }))).toBe(false);
  });

  it("builds a spoiler-safe offer payload with the matchup as title", () => {
    const p = buildLiveActivityOfferPayload(wcEvent());
    expect(p.title).toBe("BRA vs JPN");
    expect(p.subtitle).toBe("Starting now");
    expect(p.body).toBe("Tap to add the live score to your lock screen.");
    expect(p.url).toBe("/game/wc1?offer=live-activity");
    expect(p.tag).toBe("wc1:wc-kickoff");
    // never leak a score
    expect(p.body).not.toMatch(/\d/);
    // no em-dashes in user-facing copy
    expect(`${p.title}${p.subtitle}${p.body}`).not.toContain("—");
  });

  it("uses the nba start tag for nba tipoff offers", () => {
    const p = buildLiveActivityOfferPayload(nbaEvent({ type: "tipoff", gameId: "g9" }));
    expect(p.tag).toBe("g9:tipoff");
    expect(p.title).toBe("OKC vs SA");
  });

  it("builds offer data with type, gameId, and sport", () => {
    expect(liveActivityOfferData(wcEvent())).toEqual({
      type: "live-activity-offer",
      gameId: "wc1",
      sport: "wc",
    });
    expect(liveActivityOfferData(nbaEvent({ type: "tipoff", gameId: "g9" }))).toEqual({
      type: "live-activity-offer",
      gameId: "g9",
      sport: "nba",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- dispatcher`
Expected: FAIL — `isStartEvent`, `buildLiveActivityOfferPayload`, `liveActivityOfferData` are not exported.

- [ ] **Step 3: Implement the builders**

In `app/lib/push/dispatcher.ts`, add these exported functions just above `function buildPayload(` (around line 497):

```typescript
/** Start-of-game events that the lock-screen offer rides on. The offer
 *  variant only ever replaces these. */
const START_EVENT_TYPES = new Set<PushEvent["type"]>(["tipoff", "wc-kickoff"]);

/** True when the event is a game-start event (NBA tipoff or WC kickoff). */
export function isStartEvent(event: PushEvent): boolean {
  return START_EVENT_TYPES.has(event.type);
}

/** The matchup used as the offer title, e.g. "BRA vs JPN". */
function offerMatchup(event: PushEvent): string {
  return `${event.awayCode} vs ${event.homeCode}`;
}

/** The collapse tag for a start event — must match the tag buildPayload
 *  uses for the same event so the offer and the normal start push share a
 *  Notification Center slot. */
function startTag(event: PushEvent): string {
  return event.type === "wc-kickoff"
    ? `${event.gameId}:wc-kickoff`
    : `${event.gameId}:tipoff`;
}

/** The "tap to add the live score to your lock screen" offer payload.
 *  Spoiler-safe by construction (start = 0-0, no score in copy). iOS only;
 *  never sent to web push. The url carries an ?offer marker as a fallback
 *  so older builds without the tap handler still land on the game page. */
export function buildLiveActivityOfferPayload(event: PushEvent): PushPayload {
  return {
    title: offerMatchup(event),
    subtitle: "Starting now",
    body: "Tap to add the live score to your lock screen.",
    url: `/game/${event.gameId}?offer=live-activity`,
    tag: startTag(event),
  };
}

/** Custom APNs data the tap handler reads to pin the game + start the
 *  Live Activity. Sent as top-level keys alongside `aps`. */
export function liveActivityOfferData(event: PushEvent): Record<string, string> {
  return {
    type: "live-activity-offer",
    gameId: event.gameId,
    sport: isWCEvent(event) ? "wc" : "nba",
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- dispatcher`
Expected: PASS (all dispatcher tests, including the new block).

- [ ] **Step 5: Commit**

```bash
git add app/lib/push/dispatcher.ts app/lib/push/dispatcher.test.ts
git commit -m "feat(push): offer payload + eligibility builders for lock-screen live score"
```

---

### Task 2: APNs sender carries custom data

**Files:**
- Modify: `app/lib/push/apns-sender.ts:188-248` (the `sendApnsPush` opts type and the payload object)
- Test: `app/lib/push/apns-sender.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `sendApnsPush` accepts a new optional `data?: Record<string, string>`. A new exported pure helper `buildApnsPayload(alert, data?)` is added so the serialization is unit-testable without network/JWT.

- [ ] **Step 1: Write the failing test**

Create `app/lib/push/apns-sender.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildApnsPayload } from "./apns-sender";

describe("buildApnsPayload", () => {
  it("wraps the alert under aps with sound + mutable-content", () => {
    const p = buildApnsPayload({ title: "T", body: "B" });
    expect(p.aps).toEqual({
      alert: { title: "T", body: "B" },
      sound: "default",
      "mutable-content": 1,
    });
  });

  it("places custom data as top-level keys alongside aps", () => {
    const p = buildApnsPayload(
      { title: "BRA vs JPN", body: "Tap to add the live score to your lock screen." },
      { type: "live-activity-offer", gameId: "wc1", sport: "wc" }
    );
    expect(p.type).toBe("live-activity-offer");
    expect(p.gameId).toBe("wc1");
    expect(p.sport).toBe("wc");
    // aps stays intact and the custom keys are NOT inside it
    expect((p.aps as Record<string, unknown>).type).toBeUndefined();
  });

  it("omits custom keys when no data is given", () => {
    const p = buildApnsPayload({ title: "T", body: "B" });
    expect(Object.keys(p)).toEqual(["aps"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- apns-sender`
Expected: FAIL — `buildApnsPayload` is not exported.

- [ ] **Step 3: Implement**

In `app/lib/push/apns-sender.ts`, add this exported helper just above `export async function sendApnsPush(` (around line 185):

```typescript
/** Build the APNs JSON body. `aps` holds the visible alert; any custom
 *  `data` becomes TOP-LEVEL keys (siblings of `aps`), which is how Apple
 *  delivers custom fields and how Capacitor surfaces them on the web side
 *  as `notification.data`. Custom keys must never go inside `aps`. */
export function buildApnsPayload(
  alert: Record<string, string>,
  data?: Record<string, string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    aps: {
      alert,
      sound: "default",
      "mutable-content": 1,
    },
  };
  if (data) {
    for (const [k, v] of Object.entries(data)) payload[k] = v;
  }
  return payload;
}
```

Then add the `data` option to the `sendApnsPush` opts type. Find (around line 207-211):

```typescript
  /** Diagnostics only: when true, do NOT auto-retry the other
   *  environment. Lets the test endpoint see each environment's raw
   *  result in isolation. */
  noFallback?: boolean;
}): Promise<ApnsResult> {
```

Replace with:

```typescript
  /** Diagnostics only: when true, do NOT auto-retry the other
   *  environment. Lets the test endpoint see each environment's raw
   *  result in isolation. */
  noFallback?: boolean;
  /** Optional custom data delivered as top-level APNs keys (outside
   *  `aps`). Capacitor surfaces these as `notification.data` on tap.
   *  Used by the lock-screen live-score offer. */
  data?: Record<string, string>;
}): Promise<ApnsResult> {
```

Then replace the payload construction. Find (around line 237-248):

```typescript
  const alert: Record<string, string> = {
    title: opts.title,
    body: opts.body,
  };
  if (opts.subtitle) alert.subtitle = opts.subtitle;
  const payload = {
    aps: {
      alert,
      sound: "default",
      "mutable-content": 1,
    },
  };
```

Replace with:

```typescript
  const alert: Record<string, string> = {
    title: opts.title,
    body: opts.body,
  };
  if (opts.subtitle) alert.subtitle = opts.subtitle;
  const payload = buildApnsPayload(alert, opts.data);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- apns-sender`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/push/apns-sender.ts app/lib/push/apns-sender.test.ts
git commit -m "feat(push): let sendApnsPush carry custom top-level data keys"
```

---

### Task 3: `lockScreenOffers` on the iOS token store + sync validation + register endpoint

**Files:**
- Modify: `app/lib/push/sync-validation.ts` (type + parser)
- Modify: `app/lib/push/ios-token-store.ts` (`StoredIosToken`, `normalizeStored`, `upsertIosToken`)
- Modify: `app/api/push/register-ios/route.ts` (Body type + pass-through)
- Test: `app/lib/push/sync-validation.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ValidSyncPayload` gains `lockScreenOffers: boolean` (defaults to `true` when absent).
  - `StoredIosToken` gains `lockScreenOffers: boolean`.
  - `upsertIosToken` input gains optional `lockScreenOffers?: boolean`.

- [ ] **Step 1: Write the failing test**

Create `app/lib/push/sync-validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateSyncPayload } from "./sync-validation";

describe("validateSyncPayload lockScreenOffers", () => {
  it("defaults lockScreenOffers to true when absent", () => {
    expect(validateSyncPayload({ alerts: [] }).lockScreenOffers).toBe(true);
  });

  it("defaults to true on an empty/invalid payload", () => {
    expect(validateSyncPayload(null).lockScreenOffers).toBe(true);
  });

  it("respects an explicit false", () => {
    expect(
      validateSyncPayload({ alerts: [], lockScreenOffers: false }).lockScreenOffers
    ).toBe(false);
  });

  it("respects an explicit true", () => {
    expect(
      validateSyncPayload({ alerts: [], lockScreenOffers: true }).lockScreenOffers
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- sync-validation`
Expected: FAIL — `lockScreenOffers` is `undefined` on the result.

- [ ] **Step 3: Implement in `sync-validation.ts`**

Add the field to `ValidSyncPayload` (after the `noSpoilers` field, around line 19):

```typescript
  /** Whether the device wants the lock-screen live-score offer at
   *  kickoff (iOS only). Defaults true. */
  lockScreenOffers: boolean;
```

In `validateSyncPayload`, change the early return (around line 81):

```typescript
  if (!input || typeof input !== "object") {
    return { alerts: [], noSpoilers: false, lockScreenOffers: true };
  }
```

Add `lockScreenOffers?: unknown;` to the `raw` cast object (around line 84-94), then before the final `return` (around line 124-129) add:

```typescript
  // Default ON: undefined/absent → true. Only an explicit false disables.
  const lockScreenOffers = raw.lockScreenOffers !== false;
```

and change the final return to include it:

```typescript
  return { alerts, noSpoilers, lockScreenOffers, quietHours, remindBeforeMinutes, timeZone };
```

- [ ] **Step 4: Implement in `ios-token-store.ts`**

Add to `StoredIosToken` (after `noSpoilers`, around line 36):

```typescript
  /** Whether the device wants the lock-screen live-score offer at
   *  kickoff. Defaults true (undefined stored tokens are treated as on). */
  lockScreenOffers: boolean;
```

In `normalizeStored` (around line 77), add after the `noSpoilers` line:

```typescript
    lockScreenOffers:
      typeof raw.lockScreenOffers === "boolean" ? raw.lockScreenOffers : true,
```

In `upsertIosToken`, add to the input type (around line 96):

```typescript
    noSpoilers?: boolean;
    lockScreenOffers?: boolean;
```

After the `noSpoilers` resolution (around line 113-116) add:

```typescript
  const lockScreenOffers =
    input.lockScreenOffers !== undefined
      ? input.lockScreenOffers
      : existing?.lockScreenOffers ?? true;
```

Add `lockScreenOffers,` to BOTH the existing-record branch and the new-record branch of `next` (next to `noSpoilers,` in each, around lines 127 and 140). Also extend the `updatedAt` freshness check to include the new field (around line 131-134):

```typescript
        updatedAt:
          input.alerts !== undefined ||
          input.noSpoilers !== undefined ||
          input.lockScreenOffers !== undefined
            ? now
            : existing.updatedAt,
```

Also update the legacy stub object in `listIosTokens` (around line 198-205) to include `lockScreenOffers: true,` so it satisfies `StoredIosToken`.

- [ ] **Step 5: Implement in `register-ios/route.ts`**

Add to the `Body` type (around line 33-35):

```typescript
  alerts?: unknown;
  noSpoilers?: unknown;
  lockScreenOffers?: unknown;
```

In the `upsertIosToken({...})` call (around line 67-74), add:

```typescript
      noSpoilers: sync.noSpoilers,
      lockScreenOffers: sync.lockScreenOffers,
```

- [ ] **Step 6: Run the test + typecheck**

Run: `npm run test -- sync-validation`
Expected: PASS.
Run: `npm run build`
Expected: PASS (no TypeScript errors from the new required `lockScreenOffers` on `StoredIosToken`).

- [ ] **Step 7: Commit**

```bash
git add app/lib/push/sync-validation.ts app/lib/push/sync-validation.test.ts app/lib/push/ios-token-store.ts app/api/push/register-ios/route.ts
git commit -m "feat(push): persist lockScreenOffers preference per iOS token (default on)"
```

---

### Task 4: Dispatcher sends the offer variant to eligible iOS tokens

**Files:**
- Modify: `app/lib/push/dispatcher.ts:298-321` (the APNs send block inside the `runChunked` over `iosTokens`)
- Test: `app/lib/push/dispatcher.test.ts` (add a pure-decision test)

**Interfaces:**
- Consumes: `isStartEvent`, `buildLiveActivityOfferPayload`, `liveActivityOfferData` (Task 1); `StoredIosToken.lockScreenOffers` (Task 3); `sendApnsPush` `data` option (Task 2).
- Produces: a small exported pure helper `wantsLiveActivityOffer(token, event)` so the eligibility decision is unit-tested without KV/APNs.

- [ ] **Step 1: Write the failing test**

Add to `app/lib/push/dispatcher.test.ts` (extend the import from `./dispatcher` to include `wantsLiveActivityOffer`):

```typescript
describe("wantsLiveActivityOffer", () => {
  const base = { lockScreenOffers: true } as const;

  it("true for a start event when lockScreenOffers is on", () => {
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "tipoff" }))).toBe(true);
    expect(
      wantsLiveActivityOffer(base, nbaEvent({ type: "wc-kickoff", awayCode: "BRA", homeCode: "JPN" }))
    ).toBe(true);
  });

  it("false when the toggle is off", () => {
    expect(
      wantsLiveActivityOffer({ lockScreenOffers: false }, nbaEvent({ type: "tipoff" }))
    ).toBe(false);
  });

  it("false for non-start events even with the toggle on", () => {
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "final" }))).toBe(false);
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "close-game" }))).toBe(false);
  });

  it("treats undefined lockScreenOffers as on (default)", () => {
    expect(wantsLiveActivityOffer({}, nbaEvent({ type: "tipoff" }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- dispatcher`
Expected: FAIL — `wantsLiveActivityOffer` is not exported.

- [ ] **Step 3: Implement the helper**

In `app/lib/push/dispatcher.ts`, add just below `isStartEvent` (from Task 1):

```typescript
/** Eligibility for the lock-screen live-score offer variant. iOS-only by
 *  construction (only the APNs loop calls it). Default ON: a token whose
 *  lockScreenOffers is undefined is treated as opted in. */
export function wantsLiveActivityOffer(
  token: { lockScreenOffers?: boolean },
  event: PushEvent
): boolean {
  return isStartEvent(event) && token.lockScreenOffers !== false;
}
```

- [ ] **Step 4: Wire it into the APNs send block**

In `dispatchEvents`, inside the `runChunked(matching, ..., async (ios) => {` loop, replace the payload + send (around line 298-321):

```typescript
        const payload = buildPayload(event, ios.noSpoilers);
        apnsAttempted += 1;
        const result = await sendApnsPush({
          deviceToken: ios.token,
          title: payload.title,
          subtitle: payload.subtitle,
          body: payload.body,
          collapseId: payload.tag,
          sandbox: false,
        });
```

with:

```typescript
        // Lock-screen live-score offer: for an eligible iOS recipient at
        // kickoff, send the offer variant INSTEAD of the plain start push
        // (one payload per recipient, so no double notification). The tap
        // carries data the web layer reads to pin the game + start the
        // Live Activity. Everyone else gets the normal payload.
        const offer = wantsLiveActivityOffer(ios, event);
        const payload = offer
          ? buildLiveActivityOfferPayload(event)
          : buildPayload(event, ios.noSpoilers);
        apnsAttempted += 1;
        const result = await sendApnsPush({
          deviceToken: ios.token,
          title: payload.title,
          subtitle: payload.subtitle,
          body: payload.body,
          collapseId: payload.tag,
          data: offer ? liveActivityOfferData(event) : undefined,
          sandbox: false,
        });
```

Note: the web push loop above is intentionally untouched. Web recipients never get the offer.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test -- dispatcher`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/lib/push/dispatcher.ts app/lib/push/dispatcher.test.ts
git commit -m "feat(push): send live-score offer variant to eligible iOS tokens at kickoff"
```

---

### Task 5: `lockScreenOffers` preference in app state (type, default, storage, provider setter)

**Files:**
- Modify: `app/companion/state/types.ts` (`UserPrefs` + `DEFAULT_PREFS`)
- Modify: `app/companion/state/storage.ts:141-196` (`normalizeStoredPrefs`)
- Modify: `app/companion/providers.tsx` (`PrefsCtx`, setter, memo)
- Test: `app/companion/state/storage.test.ts` (create or extend)

**Interfaces:**
- Consumes: nothing new.
- Produces: `UserPrefs.lockScreenOffers?: boolean`; `DEFAULT_PREFS.lockScreenOffers = true`; `useUserPrefs().setLockScreenOffers(value: boolean)`.

- [ ] **Step 1: Write the failing test**

Create `app/companion/state/storage.test.ts` (if it exists, append the `describe`):

```typescript
import { describe, it, expect } from "vitest";
import { normalizeStoredPrefs } from "./storage";

describe("normalizeStoredPrefs lockScreenOffers", () => {
  it("defaults to true when absent", () => {
    expect(normalizeStoredPrefs({}).lockScreenOffers).toBe(true);
  });

  it("preserves an explicit false across a round-trip", () => {
    expect(normalizeStoredPrefs({ lockScreenOffers: false }).lockScreenOffers).toBe(false);
  });

  it("preserves an explicit true", () => {
    expect(normalizeStoredPrefs({ lockScreenOffers: true }).lockScreenOffers).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- storage`
Expected: FAIL — `lockScreenOffers` is dropped by the normalizer (it rebuilds prefs field-by-field).

- [ ] **Step 3: Implement in `types.ts`**

Add to `UserPrefs` (after `noSpoilers`, around line 39):

```typescript
  /** Whether kickoff pushes for followed games offer to add the live
   *  score to the lock screen (iOS only). Default on. */
  lockScreenOffers?: boolean;
```

Add to `DEFAULT_PREFS` (around line 94-99):

```typescript
export const DEFAULT_PREFS: UserPrefs = {
  noSpoilers: false,
  lockScreenOffers: true,
  defaultAlertTier: "companion",
  plan: "free",
  remindBeforeMinutes: 30,
};
```

- [ ] **Step 4: Implement in `storage.ts`**

In `normalizeStoredPrefs`, add inside the `next` object literal (next to `noSpoilers:`, around line 146-149):

```typescript
    lockScreenOffers:
      typeof value.lockScreenOffers === "boolean"
        ? value.lockScreenOffers
        : DEFAULT_PREFS.lockScreenOffers,
```

- [ ] **Step 5: Implement the provider setter in `providers.tsx`**

Add to `PrefsCtx` (after `setNoSpoilers`, around line 94):

```typescript
  setLockScreenOffers: (value: boolean) => void;
```

Add the setter (next to `setNoSpoilers`, around line 345):

```typescript
  const setLockScreenOffers = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, lockScreenOffers: value };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);
```

Add `setLockScreenOffers` to the `prefsValue` memo object and its dependency array (around line 485-516), next to `setNoSpoilers` in both places.

- [ ] **Step 6: Run the test + typecheck**

Run: `npm run test -- storage`
Expected: PASS.
Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/companion/state/types.ts app/companion/state/storage.ts app/companion/state/storage.test.ts app/companion/providers.tsx
git commit -m "feat(prefs): add lockScreenOffers preference (default on) with persistence"
```

---

### Task 6: Settings toggle UI

**Files:**
- Create: `app/companion/settings/LockScreenOffersToggle.tsx`
- Modify: `app/companion/settings/SettingsClient.tsx` (import + render)

**Interfaces:**
- Consumes: `useUserPrefs().prefs.lockScreenOffers` + `setLockScreenOffers` (Task 5).
- Produces: `<LockScreenOffersToggle />`.

- [ ] **Step 1: Create the component**

Create `app/companion/settings/LockScreenOffersToggle.tsx` (mirrors `NoSpoilersToggle.tsx`; default-on means `on = prefs.lockScreenOffers !== false`):

```tsx
"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Lock-screen live-score offer toggle. When on, the kickoff push for a
// followed game offers (one tap) to add that game's live score to the
// lock screen. iOS only in effect; harmless on web (web has no Live
// Activities), so the control is shown everywhere for a consistent
// settings surface. Default on.

export function LockScreenOffersToggle() {
  const { prefs, setLockScreenOffers, hydrated } = useUserPrefs();
  const on = prefs.lockScreenOffers !== false;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Lock screen</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-4 py-3"
        style={{
          background: on ? "var(--ink)" : "var(--paper)",
          borderColor: on ? "var(--ink)" : "var(--line)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px]"
              style={{ color: on ? "var(--cream)" : "var(--ink)", fontWeight: 700 }}
            >
              {on ? "Lock screen live scores are on." : "Lock screen live scores are off."}
            </p>
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{
                color: on ? "var(--cream)" : "var(--mute-1)",
                opacity: on ? 0.8 : 1,
                fontWeight: 500,
              }}
            >
              {on
                ? "When a followed game starts, you can tap the notification to add the live score to your lock screen."
                : "Turn on to get a one-tap offer to add a game's live score to your lock screen when it starts."}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={on ? "Turn lock screen live scores off" : "Turn lock screen live scores on"}
            disabled={!hydrated}
            onClick={() => setLockScreenOffers(!on)}
            className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition active:scale-[0.97]"
            style={{
              background: on ? "var(--cream)" : "var(--cream-2)",
              border: on ? "1px solid var(--cream)" : "1px solid var(--line)",
              opacity: hydrated ? 1 : 0.5,
            }}
          >
            <span
              aria-hidden
              className="block h-6 w-6 rounded-full transition-transform"
              style={{
                background: on ? "var(--ink)" : "var(--mute-1)",
                transform: on ? "translateX(24px)" : "translateX(4px)",
              }}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Render it in `SettingsClient.tsx`**

Add the import next to the `NoSpoilersToggle` import (line 5):

```tsx
import { NoSpoilersToggle } from "./NoSpoilersToggle";
import { LockScreenOffersToggle } from "./LockScreenOffersToggle";
```

In the `space-y-5` block (around line 57-58), render it right after `<NoSpoilersToggle />`:

```tsx
      <div className="space-y-5">
        <NoSpoilersToggle />
        <LockScreenOffersToggle />
        <AlertsSummary />
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build`
Expected: PASS.
Run: `npm run lint`
Expected: 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add app/companion/settings/LockScreenOffersToggle.tsx app/companion/settings/SettingsClient.tsx
git commit -m "feat(settings): lock screen live scores toggle"
```

---

### Task 7: Sync `lockScreenOffers` to the server from the iOS app

**Files:**
- Modify: `app/companion/push/CapacitorPushBootstrap.tsx` (`SyncPayload`, `postRegister`, `buildSync`, `hashSync`, refs + deps)

**Interfaces:**
- Consumes: `useUserPrefs().prefs.lockScreenOffers` (Task 5); `/api/push/register-ios` accepting `lockScreenOffers` (Task 3).
- Produces: the iOS device posts `lockScreenOffers` so the dispatcher can gate on it.

- [ ] **Step 1: Extend the SyncPayload type + register body**

In `app/companion/push/CapacitorPushBootstrap.tsx`, add to `SyncPayload` (around line 36-42):

```typescript
type SyncPayload = {
  alerts: Array<{ kind: string; id: string; tier: string }>;
  noSpoilers: boolean;
  lockScreenOffers: boolean;
  quietHours?: { start: string; end: string };
  remindBeforeMinutes?: number;
  timeZone?: string;
};
```

In `postRegister`'s body (around line 49-56), add `lockScreenOffers: sync.lockScreenOffers,` next to `noSpoilers`.

- [ ] **Step 2: Extend `buildSync` + `hashSync`**

Change `buildSync`'s `opts` to include `lockScreenOffers` and set it on the returned object. Replace the function (around line 69-86):

```typescript
function buildSync(
  follows: ReturnType<typeof useFollows>["follows"],
  opts: {
    noSpoilers: boolean;
    lockScreenOffers: boolean;
    quietHours?: { start: string; end: string };
    remindBeforeMinutes?: number;
  }
): SyncPayload {
  return {
    alerts: follows
      .filter((f) => f.alertEnabled)
      .map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier })),
    noSpoilers: opts.noSpoilers,
    lockScreenOffers: opts.lockScreenOffers,
    quietHours: opts.quietHours,
    remindBeforeMinutes: opts.remindBeforeMinutes,
    timeZone: deviceTimeZone(),
  };
}
```

In `hashSync` (around line 88-105), add the new field so a toggle change triggers a re-POST. Insert after the `noSpoilers` segment:

```typescript
function hashSync(sync: SyncPayload): string {
  return (
    (sync.noSpoilers ? "1" : "0") +
    "|" +
    (sync.lockScreenOffers ? "1" : "0") +
    "|" +
    (sync.quietHours
      ? `${sync.quietHours.start}-${sync.quietHours.end}`
      : "none") +
    "|" +
    (sync.remindBeforeMinutes ?? "def") +
    "|" +
    (sync.timeZone ?? "notz") +
    "|" +
    sync.alerts
      .map((a) => `${a.kind}:${a.id}:${a.tier}`)
      .sort()
      .join(",")
  );
}
```

- [ ] **Step 3: Wire the pref into the component's refs + effects**

In `CapacitorPushBootstrap`, add a ref (next to `noSpoilersRef`, around line 116):

```typescript
  const noSpoilersRef = useRef(prefs.noSpoilers);
  const lockScreenOffersRef = useRef(prefs.lockScreenOffers !== false);
```

In the ref-sync effect (around line 138-150), add the assignment and the dependency:

```typescript
  useEffect(() => {
    followsRef.current = follows;
    noSpoilersRef.current = prefs.noSpoilers;
    lockScreenOffersRef.current = prefs.lockScreenOffers !== false;
    quietHoursRef.current = prefs.quietHours;
    remindRef.current = prefs.remindBeforeMinutes;
    dismissNotifPromptRef.current = dismissNotifPrompt;
  }, [
    follows,
    prefs.noSpoilers,
    prefs.lockScreenOffers,
    prefs.quietHours,
    prefs.remindBeforeMinutes,
    dismissNotifPrompt,
  ]);
```

In the `registration` listener's `buildSync` call (around line 228-232), add `lockScreenOffers: lockScreenOffersRef.current,`.

In the sync effect's `buildSync` call (around line 283-287) add `lockScreenOffers: prefs.lockScreenOffers !== false,`, and add `prefs.lockScreenOffers` to that effect's dependency array (around line 304-311).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS (TypeScript: all `buildSync` callers now pass `lockScreenOffers`).

- [ ] **Step 5: Commit**

```bash
git add app/companion/push/CapacitorPushBootstrap.tsx
git commit -m "feat(push): sync lockScreenOffers from iOS app to dispatcher"
```

---

### Task 8: Tap handler pins the game (starts the Live Activity)

**Files:**
- Modify: `app/companion/push/CapacitorPushBootstrap.tsx` (import `usePinned`, a `pinGameRef`, and the `pushNotificationActionPerformed` body)

**Interfaces:**
- Consumes: `usePinned().pinGame` from `../providers`; the `data` set by `liveActivityOfferData` (Task 4); `LiveActivitySync` (already mounted) reacts to the new pin.
- Produces: tapping a `live-activity-offer` notification pins `data.gameId`.

- [ ] **Step 1: Import `usePinned` and capture `pinGame` in a ref**

In `app/companion/push/CapacitorPushBootstrap.tsx`, change the providers import (line 4):

```typescript
import { useFollows, useUserPrefs, usePinned } from "../providers";
```

Inside the component, after the existing hook calls (around line 108-109), add:

```typescript
  const { pinGame } = usePinned();
```

Add a ref (next to the other refs, around line 124):

```typescript
  const pinGameRef = useRef(pinGame);
```

In the ref-sync effect (the one edited in Task 7), add `pinGameRef.current = pinGame;` and add `pinGame` to its dependency array.

- [ ] **Step 2: Implement the tap routing**

Replace the `pushNotificationActionPerformed` listener (around line 251-256):

```typescript
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          console.log("[CapacitorPush] tap:", action);
          // Lock-screen live-score offer: tapping pins the game. The
          // already-mounted LiveActivitySync poll then starts + maintains
          // the lock-screen tile (it builds the input, applies
          // No-Spoilers redaction, registers the per-Activity push token,
          // and ends the tile when the game finishes). Cold start works
          // too: this listener is attached before the queued tap fires.
          const data = action.notification?.data as
            | { type?: string; gameId?: string }
            | undefined;
          if (data?.type === "live-activity-offer" && data.gameId) {
            pinGameRef.current(data.gameId);
          }
        }
      );
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build`
Expected: PASS.
Run: `npm run lint`
Expected: 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add app/companion/push/CapacitorPushBootstrap.tsx
git commit -m "feat(push): tapping the live-score offer pins the game to start the Live Activity"
```

---

### Task 9: Full gate + on-device verification notes

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate**

Run: `npm run lint`
Expected: 0 warnings.
Run: `npm run build`
Expected: PASS, page count unchanged.
Run: `npm run test`
Expected: all suites pass (dispatcher, apns-sender, sync-validation, storage, plus the pre-existing suites).

- [ ] **Step 2: Sync the native project**

Run: `npm run ios:sync`
Expected: Capacitor copies the web build into the iOS app. No Swift changes are required for this feature.

- [ ] **Step 3: On-device manual checklist (cannot be unit-tested)**

Document results in `app/CHANGELOG_PRODUCT.md` when verified:
- With `lockScreenOffers` on, a followed game's kickoff push shows the matchup title + "Tap to add the live score to your lock screen." (Build can be forced via the admin test-event endpoint `POST /api/admin/push/test-event` with a `tipoff`/`wc-kickoff` event for a followed game.)
- Tapping from the background pins the game and a Live Activity appears on the lock screen within ~15s (LiveActivitySync's live poll interval).
- Tapping from a cold start (app fully closed) also pins + starts the tile.
- A spoiler-hidden follow starts the tile redacted.
- With `lockScreenOffers` off, the same kickoff delivers the normal "Kickoff/Tipoff" push and no offer.
- Confirm `action.notification.data` actually carries `{ type, gameId, sport }` on tap. If Capacitor does not surface the top-level keys, fall back to parsing the `?offer=live-activity` marker from the launch URL (the offer payload already sets it) and read `gameId` from the path.

- [ ] **Step 4: Commit any changelog/doc updates**

```bash
git add app/CHANGELOG_PRODUCT.md
git commit -m "docs: record lock-screen live-score offer verification"
```

---

## Self-Review

**Spec coverage:**
- Trigger + per-recipient choice → Tasks 1, 4. ✓
- No double notification (one payload per recipient) → Task 4 (offer replaces start in the single APNs send). ✓
- Payload carries data → Task 2. ✓
- Offer copy (spoiler-safe, no em-dash) → Task 1 (asserted in tests). ✓
- Tap handling pins the game → Task 8; cold-start covered in checklist Task 9. ✓
- No-Spoilers respected → inherited from `LiveActivitySync` (unchanged); verified in Task 9. ✓
- Settings toggle (default on) → Tasks 5, 6. ✓
- Sync to server → Tasks 3, 7. ✓
- Web never gets the offer → Task 4 (web loop untouched; helper is iOS-loop-only). ✓
- iOS-version fallback via `?offer=live-activity` url → Task 1 payload + Task 9 fallback note. ✓
- Risks (custom data delivery, graceful degradation) → Task 9 checklist. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `lockScreenOffers` is the single field name across `UserPrefs`, `DEFAULT_PREFS`, `normalizeStoredPrefs`, `ValidSyncPayload`, `StoredIosToken`, `upsertIosToken`, register-ios `Body`, `SyncPayload`, and the dispatcher helper. `wantsLiveActivityOffer`, `isStartEvent`, `buildLiveActivityOfferPayload`, `liveActivityOfferData`, `buildApnsPayload` names match between their definitions (Tasks 1, 2, 4) and uses (Task 4). ✓
