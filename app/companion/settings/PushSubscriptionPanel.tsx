"use client";

import { useCallback, useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { isCapacitorNative } from "../dev/native-detect";
import { useFollows, useUserPrefs } from "../providers";
import { LIVE_ACTIVITY_SANDBOX } from "../native/live-activity";
import {
  postWithRetry,
  readRegisterState,
  type RegisterState,
} from "../push/register-state";
import { usePushSubscription } from "../push/use-push-subscription";

// Stage B push panel — lives in Settings.
//
// Shows the current Web Push subscription state for this device and
// exposes three actions:
//
//   1. Enable / Disable     — controls the browser-level subscription
//   2. Send test push       — fires a real server-initiated push
//   3. Send in 10s          — same, but with a delay so the user can
//                             close the app and confirm closed-app push
//
// This panel does NOT request notification permission — that flow lives
// on Today's EnableNotificationsCard so a fresh install user sees it
// without digging into Settings. The panel assumes the user is either
// already past that step, or is here to disable / debug.
//
// Native iOS short-circuits the whole panel: push is handled by APNs
// through Capacitor, not by Web Push, so the Web Push subscription
// state is meaningless here. We point users to the iOS Settings path
// instead of showing the misleading "browser doesn't support push" copy.

// Thin dispatcher so neither branch calls hooks conditionally (the web
// panel's usePushSubscription/useState only mount when we render it).
// Native iOS uses APNs via Capacitor, not Web Push, so it gets a
// dedicated panel; everyone else gets the Web Push panel.
export function PushSubscriptionPanel() {
  if (isCapacitorNative()) return <NativePushPanel />;
  return <WebPushPanel />;
}

function WebPushPanel() {
  const { status, subscribe, unsubscribe, sendTest } = usePushSubscription();
  const [working, setWorking] = useState<null | "subscribe" | "unsubscribe" | "test" | "delayed-test">(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // States where the panel renders no controls — only an explanatory line.
  if (status.state === "loading") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Checking subscription status…
        </p>
      </section>
    );
  }

  if (status.state === "unsupported") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Push isn&apos;t supported in this browser. On iPhone, install the app to your home screen
          first. Safari tabs can&apos;t receive push.
        </p>
      </section>
    );
  }

  if (status.state === "no-vapid") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Push backend not configured for this environment. Missing{" "}
          <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>.
        </p>
      </section>
    );
  }

  async function handleSubscribe() {
    setWorking("subscribe");
    setFeedback(null);
    const sub = await subscribe();
    setWorking(null);
    if (!sub) {
      setFeedback(
        "Couldn't subscribe. If you haven't enabled notifications yet, do that from Today first."
      );
    } else {
      setFeedback("Subscribed. Push is live on this device.");
    }
  }

  async function handleUnsubscribe() {
    setWorking("unsubscribe");
    setFeedback(null);
    await unsubscribe();
    setWorking(null);
    setFeedback("Unsubscribed. No more push to this device until you re-enable.");
  }

  async function handleTest(delayMs: number) {
    setWorking(delayMs > 0 ? "delayed-test" : "test");
    setFeedback(null);
    const res = await sendTest({ delayMs });
    setWorking(null);
    if (res.ok) {
      setFeedback(
        delayMs > 0
          ? `Test push queued. Close the app within ${Math.round(delayMs / 1000)}s.`
          : "Test push sent. Check your notification tray."
      );
    } else {
      setFeedback(res.error ?? "Test push failed.");
    }
  }

  return (
    <section>
      <PanelHeader />

      <p
        className="mb-3 text-[12px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {status.state === "subscribed"
          ? "This device receives pushes, even when the app is closed."
          : status.state === "error"
            ? status.message
            : "Push is off on this device."}
      </p>

      <div className="flex flex-col gap-2">
        {status.state === "subscribed" ? (
          <>
            <button
              type="button"
              onClick={() => handleTest(0)}
              disabled={working !== null}
              aria-label="Send a test push right now"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
                opacity: working ? 0.7 : 1,
              }}
            >
              {working === "test" ? "Sending…" : "Send test push now"}
            </button>
            <button
              type="button"
              onClick={() => handleTest(10_000)}
              disabled={working !== null}
              aria-label="Send a test push in 10 seconds so you can close the app first"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                opacity: working ? 0.7 : 1,
              }}
            >
              {working === "delayed-test"
                ? "Queued. Close the app…"
                : "Send in 10s (close the app to test)"}
            </button>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={working !== null}
              aria-label="Unsubscribe this device from push"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--mute-1)",
                border: "1px solid var(--line)",
              }}
            >
              {working === "unsubscribe" ? "Unsubscribing…" : "Disable push on this device"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={working !== null}
            aria-label="Subscribe this device to push"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
              opacity: working ? 0.7 : 1,
            }}
          >
            {working === "subscribe" ? "Subscribing…" : "Enable push on this device"}
          </button>
        )}
      </div>

      {feedback ? (
        <p
          className="mt-3 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <Eyebrow>Push on this device</Eyebrow>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
    </div>
  );
}

// Native-iOS variant of the push panel.
//
// Reads the real APNs permission state from Capacitor's
// PushNotifications plugin and renders one of three states:
//
//   • Loading       — checking the OS for current permission state
//   • Granted       — "Push notifications on." (positive confirmation)
//   • Not granted   — "Turn on notifications" button
//
// When the user taps "Turn on":
//   • If the OS state is "prompt" (never asked), we call
//     requestPermissions() to fire the system dialog and then register
//     to get a fresh APNs token.
//   • If the OS state is "denied" (already declined once), iOS won't
//     re-show the prompt programmatically — we open the iOS Settings
//     URL scheme so the user can flip the toggle manually.
//
// Dynamic imports keep @capacitor/push-notifications out of the web
// bundle. Same pattern as CapacitorPushBootstrap.
type NativePermState =
  | "loading"
  | "granted"
  | "prompt"
  | "denied"
  | "error";

function NativePushPanel() {
  const [perm, setPerm] = useState<NativePermState>("loading");
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const mod = await import("@capacitor/push-notifications");
      const status = await mod.PushNotifications.checkPermissions();
      if (status.receive === "granted") setPerm("granted");
      else if (status.receive === "denied") setPerm("denied");
      else setPerm("prompt");
    } catch (err) {
      console.warn("[NativePush] checkPermissions failed:", err);
      setPerm("error");
    }
  }, []);

  useEffect(() => {
    // Sync UI state from the OS permission store on mount — the
    // sanctioned external-store-sync use of an effect (same pattern as
    // EnableNotificationsCard). setState lands after an await, not
    // synchronously, so it can't cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function handleTurnOn() {
    setWorking(true);
    setFeedback(null);
    try {
      const mod = await import("@capacitor/push-notifications");

      // If the user already denied, requestPermissions() won't re-prompt.
      // Send them to iOS Settings instead. Capacitor's WKWebView will
      // honor the app-settings: scheme and open the system settings
      // page for this app.
      if (perm === "denied") {
        // The simplest open-Settings path that works inside WKWebView.
        // No extra plugin required.
        window.location.href = "app-settings:";
        setFeedback("Opening iOS Settings. Toggle Allow Notifications on.");
        return;
      }

      const result = await mod.PushNotifications.requestPermissions();
      if (result.receive === "granted") {
        await mod.PushNotifications.register();
        setPerm("granted");
        setFeedback("Notifications are on. Real pushes will start landing on your lock screen.");
      } else if (result.receive === "denied") {
        setPerm("denied");
        setFeedback(
          "You declined the iOS prompt. To turn notifications on later, open iOS Settings, find No Noise Scores, and tap Notifications."
        );
      } else {
        // "prompt" or "prompt-with-rationale" — the dialog was dismissed
        // without a clear yes/no. Leave state as-is.
        setFeedback("No change. Tap Turn on again when you're ready.");
      }
    } catch (err) {
      console.warn("[NativePush] turn-on failed:", err);
      setFeedback("Something went wrong reaching iOS. Try iOS Settings manually.");
    } finally {
      setWorking(false);
    }
  }

  if (perm === "loading") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Checking…
        </p>
      </section>
    );
  }

  if (perm === "granted") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Push notifications on. Manage them anytime in iOS Settings.
        </p>
        <RegistrationDiagnostics />
      </section>
    );
  }

  if (perm === "error") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Couldn&apos;t reach iOS for notification status. To check, open iOS Settings, find No Noise Scores, and tap Notifications.
        </p>
      </section>
    );
  }

  // perm === "prompt" or "denied" — both render a Turn On button. The
  // button's behavior branches inside handleTurnOn based on which one
  // we're in.
  const helpLine =
    perm === "denied"
      ? "Notifications are off. iOS won't re-prompt, so the button opens Settings."
      : "Notifications aren't on yet. Tap below to allow them.";

  return (
    <section>
      <PanelHeader />
      <p
        className="mb-3 text-[12px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {helpLine}
      </p>
      <button
        type="button"
        onClick={handleTurnOn}
        disabled={working}
        aria-label="Turn on notifications"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
          opacity: working ? 0.7 : 1,
        }}
      >
        {working ? "Working…" : "Turn on notifications"}
      </button>
      {feedback ? (
        <p
          className="mt-3 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

// Registration diagnostics — surfaces the silent break we hit on launch
// night: iOS permission "granted" but the server-side KV row never landed
// because the register POST silently failed inside WKWebView. Shows the
// last APNs + Live Activity register POST outcome (read from localStorage)
// and gives a Re-register button that adds a one-shot "registration"
// listener, force-calls PushNotifications.register(), and POSTs with retry
// using the current follows snapshot.
function RegistrationDiagnostics() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated } = useUserPrefs();
  const [apnsState, setApnsState] = useState<RegisterState | null>(null);
  const [activityState, setActivityState] = useState<RegisterState | null>(
    null
  );
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reread = useCallback(() => {
    setApnsState(readRegisterState("apns"));
    setActivityState(readRegisterState("live-activity"));
  }, []);

  useEffect(() => {
    // Read the persisted registration state from localStorage on mount
    // (external-store sync — the sanctioned effect-setState pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reread();
  }, [reread]);

  async function reregister() {
    if (!followsHydrated || !prefsHydrated) return;
    setWorking(true);
    setNote(null);
    try {
      const pushMod = await import("@capacitor/push-notifications").catch(
        () => null
      );
      if (!pushMod) {
        setNote("Capacitor push module didn't load. Reopen the app.");
        return;
      }

      const status = await pushMod.PushNotifications.checkPermissions();
      if (status.receive !== "granted") {
        setNote(
          "Notifications aren't granted at the OS level. Toggle them on in iOS Settings first."
        );
        return;
      }

      // One-shot listener BEFORE calling register, so we don't miss the
      // event even if the bootstrap's listener got garbage-collected.
      let captured = false;
      const handle = await pushMod.PushNotifications.addListener(
        "registration",
        async (token) => {
          if (captured) return;
          captured = true;
          await postWithRetry({
            kind: "apns",
            endpoint: "/api/push/register-ios",
            token: token.value,
            body: {
              token: token.value,
              alerts: follows
                .filter((f) => f.alertEnabled)
                .map((f) => ({
                  kind: f.kind,
                  id: f.id,
                  tier: f.alertTier,
                })),
              noSpoilers: prefs.noSpoilers,
            },
          });
          reread();
        }
      );

      await pushMod.PushNotifications.register();

      // Wait up to ~6s for the token + POST to complete, then tear
      // down the one-shot listener.
      await new Promise((r) => setTimeout(r, 6000));
      await handle.remove();

      reread();
      setNote(
        captured
          ? "Re-registered. Server should now have your push token."
          : "iOS never delivered a token. Try force-quit + reopen and try again."
      );
    } catch (err) {
      console.warn("[NativePush] re-register failed:", err);
      setNote(
        err instanceof Error
          ? `Failed: ${err.message}`
          : "Failed. Check Safari Web Inspector logs."
      );
    } finally {
      setWorking(false);
    }
  }

  const anyState = apnsState || activityState;

  return (
    <div
      className="mt-3 rounded-[10px] border px-3 py-2.5"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Eyebrow>Diagnostics</Eyebrow>
        <button
          type="button"
          onClick={reread}
          aria-label="Refresh registration status"
          className="text-[10px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Refresh
        </button>
      </div>

      <StatusLine label="APNs registration" state={apnsState} />
      <StatusLine label="Live Activity tokens" state={activityState} />
      {!anyState ? (
        <p
          className="mt-1 text-[11px]"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          No registration attempts recorded on this device yet. Tap
          Re-register to force one.
        </p>
      ) : null}

      <button
        type="button"
        onClick={reregister}
        disabled={working || !followsHydrated || !prefsHydrated}
        aria-label="Re-register this device for push"
        className="mt-2.5 inline-flex min-h-[40px] items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
          opacity: working ? 0.7 : 1,
        }}
      >
        {working ? "Re-registering…" : "Re-register now"}
      </button>
      {note ? (
        <p
          className="mt-2 text-[11px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {note}
        </p>
      ) : null}
      <p
        className="mt-2 text-[10px] leading-snug"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        Live Activity env: {LIVE_ACTIVITY_SANDBOX ? "sandbox" : "production"}.
      </p>
    </div>
  );
}

function StatusLine({
  label,
  state,
}: {
  label: string;
  state: RegisterState | null;
}) {
  if (!state) {
    return (
      <p
        className="text-[11px]"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        {label}: <em>no attempts yet</em>
      </p>
    );
  }
  const when = new Date(state.attemptedAt).toLocaleTimeString();
  const summary =
    state.status === "ok"
      ? "ok"
      : state.status === "http-error"
        ? `HTTP ${state.httpStatus ?? "?"}`
        : state.status === "fetch-failed"
          ? "fetch failed"
          : "exception";
  const isOk = state.status === "ok";
  return (
    <p
      className="text-[11px] leading-snug"
      style={{ color: isOk ? "var(--ink)" : "var(--nba)", fontWeight: 600 }}
    >
      {label}: {summary}{" "}
      <span style={{ color: "var(--mute-2)", fontWeight: 500 }}>· {when}</span>
      {state.tokenPrefix ? (
        <span
          className="block font-mono text-[10px] select-all"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          token: {state.tokenPrefix}
        </span>
      ) : null}
      {state.detail ? (
        <span
          className="block text-[10px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {state.detail.slice(0, 160)}
        </span>
      ) : null}
    </p>
  );
}
